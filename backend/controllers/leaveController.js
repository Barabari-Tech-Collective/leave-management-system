const mongoose = require("mongoose");
const Leave = require("../models/Leave");
const User = require("../models/User");
const { sendLeaveEmail, sendApprovalEmail, sendCancellationEmail } = require("../services/emailService");

// 1. APPLY LEAVE (Notifies Vertical Lead, Teammates & Admins)
exports.applyLeave = async (req, res) => {
  try {
    const user = req.user;
    const { type, fromDate, toDate, reason, isPastLeave = false } = req.body;

    if (!type || !fromDate || !toDate) {
      return res.status(400).json({ message: "Leave type, from date, and to date are required." });
    }

    const validTypes = ["casual", "sick", "flexible", "national"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid leave type '${type}'. Allowed types: ${validTypes.join(", ")}`
      });
    }

    if (!user.leaveBalance || !user.leaveBalance[type]) {
      return res.status(400).json({
        message: "Employee leave balance record not found. Please contact your Admin."
      });
    }

    if (!user.vertical) {
      return res.status(400).json({
        message: "Your profile has no assigned vertical. Please contact your Admin to assign a vertical."
      });
    }

    const queryFromDate = new Date(`${fromDate}T00:00:00.000Z`);
    const queryToDate = new Date(`${toDate}T23:59:59.999Z`);

    if (isNaN(queryFromDate.getTime()) || isNaN(queryToDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format provided." });
    }

    if (queryToDate < queryFromDate) {
      return res.status(400).json({ message: "'To Date' cannot be earlier than 'From Date'." });
    }

    // Determine today's date in YYYY-MM-DD according to Indian Standard Time (Asia/Kolkata)
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    if (isPastLeave) {
      // Past leaves must be strictly before today (yesterday or earlier)
      if (toDate >= todayStr) {
        return res.status(400).json({
          message: "Past leave dates must be strictly before today. To apply for today or upcoming dates, please use 'Future Leave Request'."
        });
      }
      const currentYear = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric"
      }).format(new Date());
      const minPastDate = `${currentYear}-01-01`;
      if (fromDate < minPastDate) {
        return res.status(400).json({
          message: `Past leaves can only be reported for the current calendar year (${currentYear}).`
        });
      }
    } else {
      // Future/regular leaves cannot start in the past
      if (fromDate < todayStr) {
        return res.status(400).json({
          message: "'From Date' cannot be in the past for regular leave requests. Use 'Report Past Leave' instead."
        });
      }
    }

    // Calculate total days excluding Sundays (deterministic UTC date operations)
    let days = 0;
    let current = new Date(queryFromDate);
    const endDate = new Date(`${toDate}T00:00:00.000Z`);

    while (current <= endDate) {
      if (current.getUTCDay() !== 0) { // Skip Sundays (0)
        days++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    if (days <= 0) {
      return res.status(400).json({ message: "No working days selected (Sundays excluded)." });
    }

    // Check for duplicate / overlapping leave requests (pending or approved)
    const overlappingLeave = await Leave.findOne({
      user: user._id,
      status: { $in: ["pending", "approved"] },
      fromDate: { $lte: queryToDate },
      toDate: { $gte: queryFromDate }
    });

    if (overlappingLeave) {
      const existingFrom = new Date(overlappingLeave.fromDate).toLocaleDateString("en-GB");
      const existingTo = new Date(overlappingLeave.toDate).toLocaleDateString("en-GB");
      const statusLabel = overlappingLeave.status.toUpperCase();

      return res.status(400).json({
        message: `You already have an active (${statusLabel}) leave record from ${existingFrom} to ${existingTo} overlapping with these dates.`
      });
    }

    const balance = user.leaveBalance[type];
    const rawRemaining = balance.total - balance.taken;

    // 1. First check: Does the employee have enough quota left in this category?
    if (days > rawRemaining) {
      return res.status(400).json({
        message: `You don't have enough leaves left to take. Required: ${days}, Remaining: ${rawRemaining}`
      });
    }

    // 2. Second check: Account for any active pending leave requests for this category
    const pendingLeaves = await Leave.find({
      user: user._id,
      type,
      status: "pending"
    });
    const pendingDays = pendingLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
    const effectiveAvailable = rawRemaining - pendingDays;

    if (days > effectiveAvailable) {
      return res.status(400).json({
        message: `You have ${rawRemaining} remaining ${type} leave(s), but ${pendingDays} day(s) are currently pending approval. Please cancel your pending leave request(s) to apply for this leave.`,
        hasPendingConflict: true,
        pendingDays,
        rawRemaining,
        effectiveAvailable
      });
    }

    // A. Fetch Vertical Lead & Teammates in the same vertical (excluding soft-deleted/deactivated users)
    const teamMembers = await User.find({
      vertical: user.vertical,
      _id: { $ne: user._id },
      isDeleted: { $ne: true }
    }).select("email");
    const teamEmails = teamMembers.map((member) => member.email);

    // B. Fetch Admins (excluding soft-deleted/deactivated admins)
    const envAdmins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());

    const dbAdmins = await User.find({ role: "admin", isDeleted: { $ne: true } }).select("email");
    const dbAdminEmails = dbAdmins.map((admin) => admin.email);

    const adminEmails = Array.from(
      new Set([...dbAdminEmails, ...envAdmins].filter(Boolean))
    );

    let leave;
    try {
      // For past leaves, immediately deduct balance since it is auto-approved
      if (isPastLeave) {
        user.leaveBalance[type].taken += days;
        await user.save({ validateBeforeSave: false });
      }

      // C. Create Leave record (auto-approved for past leave, pending for regular leave)
      leave = await Leave.create({
        user: user._id,
        vertical: user.vertical,
        type,
        fromDate: queryFromDate,
        toDate: new Date(`${toDate}T00:00:00.000Z`),
        days,
        reason,
        isPastLeave: Boolean(isPastLeave),
        status: isPastLeave ? "approved" : "pending",
        emailStatus: "pending",
        emailAttempts: 0
      });

      // D. Send Email
      let emailResult;
      try {
        emailResult = await sendLeaveEmail({
          leave,
          employee: user,
          recipients: [...teamEmails, ...adminEmails],
          founderEmails: process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org"
        });
      } catch (emailErr) {
        console.error("sendLeaveEmail threw an unhandled error:", emailErr);
        emailResult = { success: false, error: emailErr.message };
      }

      if (emailResult && emailResult.success) {
        leave.emailStatus = "sent";
        leave.emailAttempts = 1;
        leave.lastEmailAttemptAt = new Date();
        leave.emailError = "";
        await leave.save();
      } else {
        leave.emailStatus = "failed";
        leave.emailAttempts = 1;
        leave.lastEmailAttemptAt = new Date();
        leave.emailError = emailResult?.error || "Email service failed to deliver message.";
        await leave.save();
      }

      res.status(201).json({
        message: isPastLeave ? "Past leave recorded successfully" : "Leave applied successfully",
        leave,
        emailSent: leave.emailStatus === "sent"
      });
    } catch (innerErr) {
      console.error("Error during leave creation or email processing:", innerErr);

      // Roll back balance deduction if leave creation failed for past leave
      if (isPastLeave && (!leave || !leave._id)) {
        try {
          user.leaveBalance[type].taken = Math.max(0, user.leaveBalance[type].taken - days);
          await user.save({ validateBeforeSave: false });
        } catch (rollbackErr) {
          console.error("Failed to roll back user balance after leave creation error:", rollbackErr);
        }
      }

      if (leave && leave._id && leave.emailStatus === "pending") {
        try {
          leave.emailStatus = "failed";
          leave.emailAttempts = 1;
          leave.lastEmailAttemptAt = new Date();
          leave.emailError = innerErr.message || "Email dispatch failed during leave processing.";
          await leave.save();
        } catch (saveErr) {
          console.error("Failed to mark leave emailStatus as failed on error:", saveErr);
        }
      }
      throw innerErr;
    }
  } catch (error) {
    console.log("Error applying leave:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. GET MY LEAVES (Supports server-side pagination with Load More)
exports.getMyleaves = async (req, res) => {
  try {
    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = Leave.find({ user: req.user._id }).sort({ createdAt: -1 });
    if (isPaginated) {
      query.skip(skip).limit(limit);
    }

    const [total, pendingCount, leaves] = await Promise.all([
      Leave.countDocuments({ user: req.user._id }),
      Leave.countDocuments({ user: req.user._id, status: "pending" }),
      query.exec()
    ]);

    const formattedLeaves = leaves.map((leave) => {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);

      // Handle legacy leaves: if emailStatus field is absent, treat as already 'sent'
      const isLegacy = !leave.emailStatus;
      let computedEmailStatus = isLegacy ? "sent" : leave.emailStatus;
      let computedEmailError = leave.emailError || "";

      // Detect orphaned/crashed pending leaves: if pending for > 60s, treat as failed so employee can retry
      if (computedEmailStatus === "pending") {
        const leaveCreatedAt = leave.createdAt 
          ? new Date(leave.createdAt).getTime() 
          : (leave._id && leave._id.getTimestamp ? leave._id.getTimestamp().getTime() : Date.now());
        const ageMs = Date.now() - leaveCreatedAt;
        if (ageMs > 60000) {
          computedEmailStatus = "failed";
          computedEmailError = computedEmailError || "Email dispatch was interrupted (server restarted or timed out). Click retry to resend.";
        }
      }

      return {
        _id: leave._id,
        type: leave.type,
        days: leave.days,
        reason: leave.reason,
        month: from.toLocaleString("default", { month: "short" }),
        from: from.toLocaleDateString("en-GB"),
        to: to.toLocaleDateString("en-GB"),
        status: leave.status || "pending",
        rejectionReason: leave.rejectionReason || "",
        isPastLeave: Boolean(leave.isPastLeave),
        createdAt: leave.createdAt,
        cancelledAt: leave.cancelledAt || null,
        emailStatus: computedEmailStatus,
        emailAttempts: leave.emailAttempts || 0,
        emailError: computedEmailError,
        lastEmailAttemptAt: leave.lastEmailAttemptAt || null,
        decisionEmailStatus: leave.decisionEmailStatus || "none",
        decisionEmailError: leave.decisionEmailError || "",
        cancellationEmailStatus: leave.cancellationEmailStatus || "none",
        cancellationEmailError: leave.cancellationEmailError || "",
        cancellationEmailAttempts: leave.cancellationEmailAttempts || 0,
        lastCancellationEmailAttemptAt: leave.lastCancellationEmailAttemptAt || null
      };
    });

    if (isPaginated) {
      return res.json({
        leaves: formattedLeaves,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
          hasMore: page * limit < total
        },
        pendingCount
      });
    }

    res.json(formattedLeaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. UPDATE LEAVE STATUS (Approve / Reject)
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const currentCaller = req.user;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid leave ID format." });
    }

    // Validate status parameter
    if (!status || !["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Allowed values: 'approved' or 'rejected'." });
    }

    if (status === "rejected" && (!rejectionReason || !rejectionReason.trim())) {
      return res.status(400).json({ message: "Rejection reason is required when rejecting a leave." });
    }

    const leave = await Leave.findById(req.params.id).populate("user");
    if (!leave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    // Past leaves cannot be modified or revoked as they have already been taken
    if (leave.isPastLeave) {
      return res.status(400).json({
        message: "Status of a past leave cannot be changed or revoked because the leave has already been taken."
      });
    }

    // Cancelled leaves cannot be modified
    if (leave.status === "cancelled") {
      return res.status(400).json({
        message: "Status of a leave request cancelled by the employee cannot be updated."
      });
    }

    // Prevent Vertical Leads from self-approving their own leave applications
    const isOwner = leave.user && leave.user._id.toString() === currentCaller._id.toString();
    if (isOwner && currentCaller.role !== "admin") {
      return res.status(403).json({
        message: "Vertical Leads cannot approve or reject their own leave requests. Admin approval is required."
      });
    }

    // Verify Authorization: Caller must be Admin OR the Vertical Lead of that team
    const isAuthorized = currentCaller.role === "admin" ||
      (currentCaller.isVerticalLead && currentCaller.vertical === leave.vertical);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied. Only Admins or the team's Vertical Lead can update leave status." });
    }

    const previousStatus = leave.status;

    // Balance adjustment atomically based on status transition to prevent race condition overdrafts
    if (leave.user && leave.user._id) {
      // 1. Transitioning to approved from pending/rejected -> deduct balance atomically with condition
      if (previousStatus !== "approved" && status === "approved") {
        const typeBalance = leave.user.leaveBalance?.[leave.type] || { total: 0, taken: 0 };
        const totalQuota = typeBalance.total || 0;

        const updatedUser = await User.findOneAndUpdate(
          {
            _id: leave.user._id,
            [`leaveBalance.${leave.type}.taken`]: { $lte: totalQuota - leave.days }
          },
          {
            $inc: { [`leaveBalance.${leave.type}.taken`]: leave.days }
          },
          { new: true }
        );

        if (!updatedUser) {
          const freshUser = await User.findById(leave.user._id);
          const freshTaken = freshUser?.leaveBalance?.[leave.type]?.taken || 0;
          const freshTotal = freshUser?.leaveBalance?.[leave.type]?.total || 0;
          const freshRemaining = Math.max(0, freshTotal - freshTaken);
          return res.status(400).json({
            message: `Cannot approve: Employee only has ${freshRemaining} remaining in ${leave.type} leave, but this request requires ${leave.days} day(s).`
          });
        }
        leave.user = updatedUser;
      }
      // 2. Transitioning from approved to rejected -> refund previously deducted balance atomically
      else if (previousStatus === "approved" && status !== "approved") {
        const updatedUser = await User.findByIdAndUpdate(
          leave.user._id,
          {
            $inc: { [`leaveBalance.${leave.type}.taken`]: -leave.days }
          },
          { new: true }
        );
        if (updatedUser) {
          if (updatedUser.leaveBalance?.[leave.type]?.taken < 0) {
            updatedUser.leaveBalance[leave.type].taken = 0;
            await updatedUser.save({ validateBeforeSave: false });
          }
          leave.user = updatedUser;
        }
      }
    }

    leave.status = status;
    if (status === "rejected" && rejectionReason) {
      leave.rejectionReason = rejectionReason.trim();
    } else if (status === "approved") {
      leave.rejectionReason = "";
    }
    await leave.save();

    // Dispatch status notification email (Approved or Rejected)
    let emailResult = null;
    if (leave.user && leave.user.email) {
      emailResult = await sendApprovalEmail({
        employeeEmail: leave.user.email,
        employeeName: leave.user.name || "Team Member",
        status,
        leave,
        rejectionReason: status === "rejected" ? rejectionReason : ""
      });
    }

    // Persist decision notification email status on the leave document
    const emailSent = Boolean(emailResult && emailResult.success);
    const emailError = (!emailSent && emailResult?.error) ? emailResult.error : "";

    leave.decisionEmailStatus = emailSent ? "sent" : (emailResult ? "failed" : "none");
    leave.decisionEmailError = emailError;
    leave.decisionEmailAttempts = (leave.decisionEmailAttempts || 0) + 1;
    leave.lastDecisionEmailAttemptAt = new Date();
    await leave.save();

    const responseMessage = emailSent
      ? `Leave application ${status} successfully!`
      : `Leave application ${status} successfully, but employee notification email failed to send${emailError ? `: ${emailError}` : "."}`;

    res.json({
      message: responseMessage,
      leave,
      emailSent,
      emailWarning: emailSent ? null : (emailError || "Notification email delivery failed")
    });
  } catch (err) {
    console.error("Error updating leave status:", err);
    res.status(500).json({ message: err.message });
  }
};

// 4. CANCEL LEAVE (Employee self-service for pending leaves, Admin override)
exports.cancelLeave = async (req, res) => {
  try {
    const currentCaller = req.user;
    const leaveId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(leaveId)) {
      return res.status(400).json({ message: "Invalid leave ID format." });
    }

    const leave = await Leave.findById(leaveId).populate("user");
    if (!leave) {
      return res.status(404).json({ message: "Leave record not found." });
    }

    // Verify ownership: only the owner or an admin can cancel
    const isOwner = leave.user && leave.user._id.toString() === currentCaller._id.toString();
    if (!isOwner && currentCaller.role !== "admin") {
      return res.status(403).json({ message: "Access denied. You can only cancel your own leave requests." });
    }

    // Past leaves cannot be cancelled as they were already taken
    if (leave.isPastLeave) {
      return res.status(400).json({
        message: "Past leaves cannot be cancelled because the leave has already been taken."
      });
    }

    // Check status constraints
    if (leave.status === "cancelled") {
      return res.status(400).json({ message: "This leave request has already been cancelled." });
    }

    if (leave.status === "rejected") {
      return res.status(400).json({ message: "Cannot cancel a leave request that was already rejected." });
    }

    // Approved leaves cannot be cancelled by employee
    if (leave.status === "approved" && currentCaller.role !== "admin") {
      return res.status(400).json({
        message: "Approved leaves cannot be cancelled by employees. Please contact your Admin to cancel an approved leave."
      });
    }

    const previousStatus = leave.status;
    leave.status = "cancelled";
    leave.cancelledAt = new Date();
    await leave.save();

    // If an Admin cancelled an already approved leave, refund the balance atomically
    if (previousStatus === "approved" && leave.user?._id) {
      const updatedUser = await User.findByIdAndUpdate(
        leave.user._id,
        {
          $inc: { [`leaveBalance.${leave.type}.taken`]: -leave.days }
        },
        { new: true }
      );
      if (updatedUser && updatedUser.leaveBalance?.[leave.type]?.taken < 0) {
        updatedUser.leaveBalance[leave.type].taken = 0;
        await updatedUser.save({ validateBeforeSave: false });
      }
    }

    // Dispatch cancellation email to Vertical Lead, teammates, and admins
    let emailResult = null;
    try {
      const teamMembers = await User.find({
        vertical: leave.vertical,
        _id: { $ne: leave.user?._id },
        isDeleted: { $ne: true }
      }).select("email");
      const teamEmails = teamMembers.map((m) => m.email);

      const envAdmins = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase());
      const dbAdmins = await User.find({ role: "admin", isDeleted: { $ne: true } }).select("email");
      const dbAdminEmails = dbAdmins.map((a) => a.email);
      const adminEmails = Array.from(new Set([...dbAdminEmails, ...envAdmins].filter(Boolean)));

      emailResult = await sendCancellationEmail({
        leave,
        employee: leave.user,
        cancelledBy: currentCaller,
        previousStatus,
        recipients: [...teamEmails, ...adminEmails],
        founderEmails: process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org"
      });
    } catch (emailErr) {
      console.error("Failed to send cancellation notification email:", emailErr);
      emailResult = { success: false, error: emailErr.message };
    }

    const emailSent = Boolean(emailResult && emailResult.success);
    const emailError = (!emailSent && emailResult?.error) ? emailResult.error : "";

    leave.cancellationEmailStatus = emailSent ? "sent" : (emailResult ? "failed" : "none");
    leave.cancellationEmailError = emailError;
    leave.cancellationEmailAttempts = (leave.cancellationEmailAttempts || 0) + 1;
    leave.lastCancellationEmailAttemptAt = new Date();
    await leave.save();

    const responseMessage = emailSent
      ? "Leave request cancelled successfully."
      : `Leave request cancelled, but notification email failed to send${emailError ? `: ${emailError}` : "."}`;

    res.json({
      message: responseMessage,
      leave,
      emailSent,
      emailWarning: emailSent ? null : (emailError || "Cancellation email delivery failed")
    });
  } catch (error) {
    console.error("Error cancelling leave:", error);
    res.status(500).json({ message: error.message });
  }
};

// 5. RESEND CANCELLATION NOTIFICATION EMAIL
exports.resendCancellationEmail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid leave ID format." });
    }

    const leave = await Leave.findById(id).populate("user");
    if (!leave) {
      return res.status(404).json({ message: "Leave record not found." });
    }

    if (leave.status !== "cancelled") {
      return res.status(400).json({ message: "Only cancelled leave requests can resend cancellation emails." });
    }

    // Duplicate check: Prevent resending if cancellation email was already delivered
    if (leave.cancellationEmailStatus === "sent") {
      return res.status(400).json({
        message: "Cancellation notification email was already successfully delivered.",
        cancellationEmailStatus: "sent"
      });
    }

    // Authorization: User must be the owner, vertical lead of the same vertical, or admin
    const isOwner = leave.user && leave.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isOwner && !isAdmin && !isLead) {
      return res.status(403).json({ message: "Not authorized to resend cancellation email for this leave." });
    }

    // 5 seconds rate-limit cooldown
    const COOLDOWN_SECONDS = 5;
    if (leave.lastCancellationEmailAttemptAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(leave.lastCancellationEmailAttemptAt).getTime()) / 1000);
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remainingSeconds = COOLDOWN_SECONDS - elapsedSeconds;
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second(s) before retrying email dispatch.`,
          remainingSeconds
        });
      }
    }

    const teamMembers = await User.find({
      vertical: leave.vertical,
      _id: { $ne: leave.user?._id },
      isDeleted: { $ne: true }
    }).select("email");
    const teamEmails = teamMembers.map((m) => m.email);

    const envAdmins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const dbAdmins = await User.find({ role: "admin", isDeleted: { $ne: true } }).select("email");
    const dbAdminEmails = dbAdmins.map((a) => a.email);
    const adminEmails = Array.from(new Set([...dbAdminEmails, ...envAdmins].filter(Boolean)));

    const emailResult = await sendCancellationEmail({
      leave,
      employee: leave.user,
      cancelledBy: req.user,
      previousStatus: leave.cancelledAt ? "cancelled" : "pending",
      recipients: [...teamEmails, ...adminEmails],
      founderEmails: process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org"
    });

    leave.cancellationEmailAttempts = (leave.cancellationEmailAttempts || 0) + 1;
    leave.lastCancellationEmailAttemptAt = new Date();

    if (emailResult && emailResult.success) {
      leave.cancellationEmailStatus = "sent";
      leave.cancellationEmailError = "";
      await leave.save();
      return res.json({
        message: "Cancellation notification email dispatched successfully!",
        emailStatus: "sent",
        leave
      });
    } else {
      leave.cancellationEmailStatus = "failed";
      leave.cancellationEmailError = emailResult?.error || "Email service failed to deliver message.";
      await leave.save();
      return res.status(500).json({
        message: `Failed to dispatch cancellation email`,
        emailStatus: "failed",
        leave
      });
    }
  } catch (error) {
    console.error("Error resending cancellation email:", error);
    res.status(500).json({ message: error.message });
  }
};
// 4. VERTICAL LEAD DASHBOARD: Get Team Leaves & Statistics (Supports server-side filters & pagination)
exports.getTeamLeavesForLead = async (req, res) => {
  try {
    const currentLead = req.user;

    // Verify permission: Must be Vertical Lead or Admin
    if (!currentLead.isVerticalLead && currentLead.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Vertical Leads only." });
    }

    // Target vertical selection: Only Admin can query other verticals; Leads are strictly locked to their own vertical
    const targetVertical = (currentLead.role === "admin" && req.query.vertical)
      ? req.query.vertical
      : currentLead.vertical;

    // 1. Fetch team members (Excluding soft-deleted members)
    const teamMembers = await User.find({
      vertical: targetVertical,
      isDeleted: { $ne: true }
    }).select("name email leaveBalance isVerticalLead jobRole");

    // 2. Base filter for leaves in this vertical (Excluding Lead's own requests)
    const baseFilter = {
      vertical: targetVertical,
      user: { $ne: currentLead._id }
    };

    // Calculate real stats for this vertical
    const [totalPending, totalApproved] = await Promise.all([
      Leave.countDocuments({ ...baseFilter, status: "pending" }),
      Leave.countDocuments({ ...baseFilter, status: "approved" })
    ]);

    // Available years in the database for this vertical
    const allLeaveDates = await Leave.find(baseFilter).select("fromDate");
    const yearsSet = new Set();
    yearsSet.add(new Date().getFullYear());
    allLeaveDates.forEach((l) => {
      if (l.fromDate) {
        const yr = new Date(l.fromDate).getFullYear();
        if (!isNaN(yr)) yearsSet.add(yr);
      }
    });
    const availableYears = Array.from(yearsSet).sort((a, b) => b - a);

    // Dynamic filtering by status, year, month
    const filter = { ...baseFilter };
    const { status, year, month } = req.query;

    if (status && status !== "all") {
      filter.status = status.toLowerCase();
    }

    if (year && year !== "all") {
      const y = parseInt(year);
      if (!isNaN(y)) {
        if (month && month !== "all") {
          const m = parseInt(month);
          if (!isNaN(m) && m >= 0 && m <= 11) {
            const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
            const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
            // Match any leave that overlaps with this month interval
            filter.fromDate = { $lte: end };
            filter.toDate = { $gte: start };
          }
        } else {
          const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
          const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
          // Match any leave that overlaps with this year interval
          filter.fromDate = { $lte: end };
          filter.toDate = { $gte: start };
        }
      }
    } else if (month && month !== "all") {
      const m = parseInt(month);
      if (!isNaN(m) && m >= 0 && m <= 11) {
        filter.$expr = {
          $and: [
            { $eq: [{ $type: "$fromDate" }, "date"] },
            {
              $or: [
                { $eq: [{ $month: "$fromDate" }, m + 1] },
                { $eq: [{ $month: "$toDate" }, m + 1] }
              ]
            }
          ]
        };
      }
    }

    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const query = Leave.find(filter)
      .populate("user", "name email leaveBalance vertical isVerticalLead")
      .sort({ createdAt: -1 });

    if (isPaginated) {
      query.skip(skip).limit(limit);
    }

    const [totalFiltered, teamLeaves] = await Promise.all([
      Leave.countDocuments(filter),
      query.exec()
    ]);

    res.json({
      vertical: targetVertical,
      totalTeamMembers: teamMembers.length,
      teamMembers,
      teamLeaves,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
        hasNextPage: page < Math.ceil(totalFiltered / limit),
        hasPrevPage: page > 1
      },
      stats: {
        pending: totalPending,
        approved: totalApproved
      },
      availableYears
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. RESEND LEAVE NOTIFICATION EMAIL
exports.resendLeaveEmail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid leave ID format." });
    }

    const leave = await Leave.findById(id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    // Authorization: User must be the owner, vertical lead of the same vertical, or admin
    const isOwner = leave.user && leave.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isOwner && !isAdmin && !isLead) {
      return res.status(403).json({ message: "Not authorized to resend email for this leave" });
    }

    // Resend is available after a failed dispatch OR if the leave was left stuck in 'pending' due to a server crash/timeout (> 30s)
    const isStuckPending = leave.emailStatus === "pending" &&
      (Date.now() - new Date(leave.createdAt || (leave._id && leave._id.getTimestamp ? leave._id.getTimestamp() : Date.now())).getTime() > 30000);

    if (leave.emailStatus !== "failed" && !isStuckPending) {
      return res.status(400).json({
        message: "Email retry is only available for failed or timed-out email notifications.",
        emailStatus: leave.emailStatus || "pending"
      });
    }

    // 5 seconds rate-limit cooldown
    const COOLDOWN_SECONDS = 5;
    if (leave.lastEmailAttemptAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(leave.lastEmailAttemptAt).getTime()) / 1000);
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remainingSeconds = COOLDOWN_SECONDS - elapsedSeconds;
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second(s) before retrying email dispatch.`,
          remainingSeconds
        });
      }
    }

    // Fetch active team & admin emails (excluding soft-deleted/deactivated users)
    const employee = leave.user;
    if (!employee || employee.isDeleted) {
      return res.status(400).json({ message: "Cannot resend email: Employee account is deactivated or deleted." });
    }

    const teamMembers = await User.find({
      vertical: employee.vertical,
      _id: { $ne: employee._id },
      isDeleted: { $ne: true }
    }).select("email");
    const teamEmails = teamMembers.map((m) => m.email);

    const envAdmins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());
    const dbAdmins = await User.find({ role: "admin", isDeleted: { $ne: true } }).select("email");
    const dbAdminEmails = dbAdmins.map((a) => a.email);
    const adminEmails = Array.from(new Set([...dbAdminEmails, ...envAdmins].filter(Boolean)));

    // Re-dispatch email
    const emailResult = await sendLeaveEmail({
      leave,
      employee,
      recipients: [...teamEmails, ...adminEmails],
      founderEmails: process.env.FOUNDER_EMAILS || process.env.FOUNDER_EMAIL || "harihar@barabaricollective.org"
    });

    leave.emailAttempts = (leave.emailAttempts || 0) + 1;
    leave.lastEmailAttemptAt = new Date();

    if (emailResult && emailResult.success) {
      leave.emailStatus = "sent";
      leave.emailError = "";
      await leave.save();
      return res.json({
        message: "Notification email dispatched successfully!",
        emailStatus: "sent",
        leave
      });
    } else {
      leave.emailStatus = "failed";
      leave.emailError = emailResult?.error || "Failed to dispatch email via Resend";
      await leave.save();
      return res.status(502).json({
        message: "Email dispatch failed. Please retry after cooldown.",
        emailStatus: "failed",
        error: leave.emailError,
        leave
      });
    }
  } catch (error) {
    console.error("Error in resendLeaveEmail:", error);
    res.status(500).json({ message: error.message });
  }
};

// 6. RESEND DECISION NOTIFICATION EMAIL (For Vertical Leads & Admins)
exports.resendDecisionEmail = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid leave ID format." });
    }

    const leave = await Leave.findById(id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    // Authorization: User must be Admin OR the Vertical Lead of this vertical
    const isAdmin = req.user.role === "admin";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isAdmin && !isLead) {
      return res.status(403).json({ message: "Access denied. Only Admins or the team's Vertical Lead can resend decision notifications." });
    }

    // Must be in approved or rejected state
    if (!["approved", "rejected"].includes(leave.status)) {
      return res.status(400).json({
        message: "Decision notifications can only be resent for approved or rejected leaves.",
        currentStatus: leave.status
      });
    }

    // Check if retry is valid (only if failed or never sent)
    if (leave.decisionEmailStatus === "sent") {
      return res.status(400).json({
        message: "Decision email was already successfully delivered to the employee.",
        decisionEmailStatus: "sent"
      });
    }

    // 5 seconds rate-limit cooldown
    const COOLDOWN_SECONDS = 5;
    if (leave.lastDecisionEmailAttemptAt) {
      const elapsedSeconds = Math.floor((Date.now() - new Date(leave.lastDecisionEmailAttemptAt).getTime()) / 1000);
      if (elapsedSeconds < COOLDOWN_SECONDS) {
        const remainingSeconds = COOLDOWN_SECONDS - elapsedSeconds;
        return res.status(429).json({
          message: `Please wait ${remainingSeconds} second(s) before retrying email dispatch.`,
          remainingSeconds
        });
      }
    }

    const employee = leave.user;
    if (!employee || !employee.email) {
      return res.status(400).json({ message: "Cannot send notification: Employee email not found." });
    }

    // Dispatch decision email
    const emailResult = await sendApprovalEmail({
      employeeEmail: employee.email,
      employeeName: employee.name || "Team Member",
      status: leave.status,
      leave,
      rejectionReason: leave.status === "rejected" ? (leave.rejectionReason || "") : ""
    });

    leave.decisionEmailAttempts = (leave.decisionEmailAttempts || 0) + 1;
    leave.lastDecisionEmailAttemptAt = new Date();

    if (emailResult && emailResult.success) {
      leave.decisionEmailStatus = "sent";
      leave.decisionEmailError = "";
      await leave.save();
      return res.json({
        message: `Decision notification email delivered to ${employee.email}!`,
        decisionEmailStatus: "sent",
        leave
      });
    } else {
      leave.decisionEmailStatus = "failed";
      leave.decisionEmailError = emailResult?.error || "Failed to deliver decision email via Resend.";
      await leave.save();
      return res.status(502).json({
        message: "Failed to dispatch email to employee. Please retry after cooldown.",
        decisionEmailStatus: "failed",
        error: leave.decisionEmailError,
        leave
      });
    }
  } catch (error) {
    console.error("Error in resendDecisionEmail:", error);
    res.status(500).json({ message: error.message });
  }
};
