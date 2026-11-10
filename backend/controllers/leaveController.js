const Leave = require("../models/Leave");
const User = require("../models/User");
const { sendLeaveEmail, sendApprovalEmail, sendCancellationEmail } = require("../services/emailService");
const { parseDateUTC, calculateWorkingDays } = require("../utils/dateUtils");
const { getNotificationRecipients, getFinanceEmails } = require("../utils/recipientUtils");
const { checkEmailCooldown } = require("../utils/cooldownUtils");
const { buildLeaveDateFilter, getAvailableLeaveYears } = require("../utils/leaveFilterUtils");
const {
  getCurrentISTYear,
  getLeaveBalanceForYear,
  ensureUserYearBalanceExists,
  checkAndResetAnnualLeave,
  sanitizeBalanceObject,
  buildAtomicBalanceDelta
} = require("../utils/leaveResetUtils");

// 1. APPLY LEAVE (Notifies Vertical Lead, Teammates & Admins)
exports.applyLeave = async (req, res) => {
  try {
    const user = req.user;
    const { type, fromDate, toDate, reason, isPastLeave = false } = req.body;

    if (!type || !fromDate || !toDate) {
      return res.status(400).json({ message: "Leave type, from date, and to date are required." });
    }

    const validTypes = ["casual", "sick", "flexible", "national", "extra"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: `Invalid leave type '${type}'. Allowed types: ${validTypes.join(", ")}`
      });
    }

    // Ensure active user annual balance is up to date
    await checkAndResetAnnualLeave(user);

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

    const fromYear = queryFromDate.getUTCFullYear();
    const toYear = queryToDate.getUTCFullYear();

    // Cross-year separation constraint: requests cannot span across calendar years
    if (fromYear !== toYear) {
      return res.status(400).json({
        message: `Leaves cannot span across two different calendar years (${fromYear} and ${toYear}). Please submit two separate requests: one for ${fromYear} and one for ${toYear}.`
      });
    }

    const targetYear = fromYear;
    const currentISTYear = getCurrentISTYear();

    if (targetYear > currentISTYear + 1) {
      return res.status(400).json({
        message: `Leaves can only be booked for the current year (${currentISTYear}) or up to one year in advance (${currentISTYear + 1}).`
      });
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
      const minPastDate = `${currentISTYear}-01-01`;
      if (fromDate < minPastDate) {
        return res.status(400).json({
          message: `Past leaves can only be reported for the current calendar year (${currentISTYear}).`
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
    const days = calculateWorkingDays(fromDate, toDate, true);
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
      const existingFrom = new Date(overlappingLeave.fromDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
      const existingTo = new Date(overlappingLeave.toDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
      const statusLabel = overlappingLeave.status.toUpperCase();

      return res.status(400).json({
        message: `You already have an active (${statusLabel}) leave record from ${existingFrom} to ${existingTo} overlapping with these dates.`
      });
    }

    // Ensure target year balance record is initialized for the employee
    await ensureUserYearBalanceExists(user._id, targetYear);
    const freshUser = await User.findById(user._id);
    const yearBalances = getLeaveBalanceForYear(freshUser, targetYear);
    const isExtraType = type === "extra" || Boolean(req.body.isExtraLeave);

    const typeBalance = yearBalances[type] || { total: 0, taken: 0 };
    const totalQuota = typeBalance.total || 0;
    const takenCount = typeBalance.taken || 0;
    const rawRemaining = Math.max(0, totalQuota - takenCount);

    if (isExtraType) {
      // 1. Extra Leave validation: employee must have exhausted all 26 paid leaves (including pending paid leaves)
      const totalPaidTaken =
        (yearBalances.casual?.taken || 0) +
        (yearBalances.sick?.taken || 0) +
        (yearBalances.flexible?.taken || 0);

      const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
      const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
      const pendingPaidLeaves = await Leave.find({
        user: user._id,
        type: { $in: ["casual", "sick", "flexible"] },
        status: "pending",
        fromDate: { $gte: yearStart, $lte: yearEnd }
      });
      const totalPendingPaid = pendingPaidLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
      const totalCommittedPaid = totalPaidTaken + totalPendingPaid;

      if (totalCommittedPaid < 26) {
        const remainingPaid = Math.max(0, 26 - totalCommittedPaid);
        return res.status(400).json({
          message: `Extra Leave can only be applied after exhausting all 26 annual paid leaves. You still have ${remainingPaid} paid leave(s) available for ${targetYear}.`
        });
      }
    } else {
      // 1. First check: Does the employee have enough quota left in this category for targetYear?
      if (days > rawRemaining) {
        return res.status(400).json({
          message: `You don't have enough leaves left to take for year ${targetYear}. Required: ${days}, Remaining: ${rawRemaining}`
        });
      }

      // 2. Second check: Account for active pending leave requests for targetYear
      const yearStart = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
      const yearEnd = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59, 999));
      const pendingLeaves = await Leave.find({
        user: user._id,
        type,
        status: "pending",
        fromDate: { $gte: yearStart, $lte: yearEnd }
      });
      const pendingDays = pendingLeaves.reduce((sum, l) => sum + (l.days || 0), 0);
      const effectiveAvailable = rawRemaining - pendingDays;

      if (days > effectiveAvailable) {
        return res.status(400).json({
          message: `You have ${rawRemaining} remaining ${type} leave(s) for ${targetYear}, but ${pendingDays} day(s) are currently pending approval. Please cancel your pending leave request(s) to apply for this leave.`,
          hasPendingConflict: true,
          pendingDays,
          rawRemaining,
          effectiveAvailable,
          targetYear
        });
      }
    }

    // Fetch Vertical Lead, teammates, admins, and finance (if extra leave)
    const { recipients, founderEmails } = await getNotificationRecipients(user, {
      isExtraLeave: isExtraType
    });

    let leave;
    let pastLeaveDeducted = false;
    try {
      // For past leaves, immediately and atomically deduct balance with conditional check to prevent race condition overdrafts
      if (isPastLeave) {
        const { update: incUpdate } = buildAtomicBalanceDelta({
          targetYear,
          activeUserYear: freshUser.leaveYear,
          type,
          isExtra: isExtraType,
          daysDelta: days
        });

        let updatedUser;
        if (isExtraType) {
          // Extra leaves have no quota limit
          updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $inc: incUpdate },
            { new: true }
          );
        } else {
          updatedUser = await User.findOneAndUpdate(
            {
              _id: user._id,
              [`yearlyLeaveBalances.${String(targetYear)}.${type}.taken`]: { $lte: totalQuota - days }
            },
            { $inc: incUpdate },
            { new: true }
          );
        }

        if (!updatedUser) {
          const recheckedUser = await User.findById(user._id);
          const recheckBal = getLeaveBalanceForYear(recheckedUser, targetYear);
          const currentTaken = recheckBal[type]?.taken || 0;
          const currentTotal = recheckBal[type]?.total || 0;
          const currentRemaining = Math.max(0, currentTotal - currentTaken);
          return res.status(400).json({
            message: `Cannot record past leave: Insufficient balance for ${targetYear}. Required: ${days}, Remaining: ${currentRemaining}`
          });
        }
        pastLeaveDeducted = true;
      }

      // C. Create Leave record (auto-approved for past leave, pending for regular leave)
      leave = await Leave.create({
        user: user._id,
        vertical: user.vertical,
        type: isExtraType ? "extra" : type,
        fromDate: queryFromDate,
        toDate: new Date(`${toDate}T00:00:00.000Z`),
        days,
        reason,
        isPastLeave: Boolean(isPastLeave),
        isExtraLeave: isExtraType,
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
          recipients,
          founderEmails
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

      // Roll back atomic balance deduction if leave creation failed for past leave
      if (isPastLeave && pastLeaveDeducted && (!leave || !leave._id)) {
        try {
          const { update: decUpdate } = buildAtomicBalanceDelta({
            targetYear,
            activeUserYear: freshUser.leaveYear,
            type,
            isExtra: isExtraType,
            daysDelta: -days
          });
          await User.findByIdAndUpdate(user._id, { $inc: decUpdate });
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

// 2. GET MY LEAVES (Supports server-side pagination with Load More & Filtering by Year, Month, Status)
exports.getMyleaves = async (req, res) => {
  try {
    const baseFilter = { user: req.user._id };
    const { status, year, month } = req.query;

    const filter = buildLeaveDateFilter({ year, month, status, baseFilter });

    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = Leave.find(filter).sort({ createdAt: -1 });
    if (isPaginated) {
      query.skip(skip).limit(limit);
    }

    const [availableYears, total, pendingCount, leaves] = await Promise.all([
      getAvailableLeaveYears(baseFilter),
      Leave.countDocuments(filter),
      Leave.countDocuments({ ...baseFilter, status: "pending" }),
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
        month: from.toLocaleString("default", { month: "short", timeZone: "Asia/Kolkata" }),
        from: from.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }),
        to: to.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }),
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
        availableYears,
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

    // Early guard: Check if leave is already in target status (prevents duplicate execution & emails)
    if (leave.status === status) {
      return res.status(400).json({
        message: `This leave request is already ${status}.`
      });
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

    // Founders and Admins share top-level administrative authority
    const isPrivilegedAdmin = currentCaller.role === "admin" || currentCaller.role === "founder";

    // Prevent Vertical Leads from self-approving their own leave applications
    const isOwner = leave.user && leave.user._id.toString() === currentCaller._id.toString();
    if (isOwner && !isPrivilegedAdmin) {
      return res.status(403).json({
        message: "Vertical Leads cannot approve or reject their own leave requests. Admin approval is required."
      });
    }

    // Verify Authorization: Caller must be Admin/Founder OR the Vertical Lead of that team
    const isAuthorized = isPrivilegedAdmin ||
      (currentCaller.isVerticalLead && currentCaller.vertical === leave.vertical);

    if (!isAuthorized) {
      return res.status(403).json({ message: "Access denied. Only Admins or the team's Vertical Lead can update leave status." });
    }

    const previousStatus = leave.status;

    // Balance adjustment atomically based on status transition to prevent race condition overdrafts
    if (leave.user && leave.user._id) {
      const targetYear = new Date(leave.fromDate).getUTCFullYear();
      const yearKey = String(targetYear);
      await ensureUserYearBalanceExists(leave.user._id, targetYear);

      const freshUser = await User.findById(leave.user._id);
      const isActiveYear = !freshUser.leaveYear || freshUser.leaveYear === targetYear;
      const yearBalance = getLeaveBalanceForYear(freshUser, targetYear);
      const typeBalance = yearBalance[leave.type] || { total: 0, taken: 0 };
      const totalQuota = typeBalance.total || 0;

      const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
      const targetKey = isExtraLeave ? "extra" : leave.type;

      // 1. Transitioning to approved from pending/rejected -> deduct balance atomically with condition
      if (previousStatus !== "approved" && status === "approved") {
        const { update: incUpdate, targetKey } = buildAtomicBalanceDelta({
          targetYear,
          activeUserYear: freshUser.leaveYear,
          type: leave.type,
          isExtra: isExtraLeave,
          daysDelta: leave.days
        });

        let updatedUser;
        if (isExtraLeave) {
          updatedUser = await User.findByIdAndUpdate(
            leave.user._id,
            { $inc: incUpdate },
            { new: true }
          );
        } else {
          updatedUser = await User.findOneAndUpdate(
            {
              _id: leave.user._id,
              [`yearlyLeaveBalances.${yearKey}.${leave.type}.taken`]: { $lte: totalQuota - leave.days }
            },
            { $inc: incUpdate },
            { new: true }
          );
        }

        if (!updatedUser) {
          const recheckedUser = await User.findById(leave.user._id);
          const currentBal = getLeaveBalanceForYear(recheckedUser, targetYear);
          const freshTaken = currentBal[leave.type]?.taken || 0;
          const freshTotal = currentBal[leave.type]?.total || 0;
          const freshRemaining = Math.max(0, freshTotal - freshTaken);
          return res.status(400).json({
            message: `Cannot approve: Employee only has ${freshRemaining} remaining in ${leave.type} leave for ${targetYear}, but this request requires ${leave.days} day(s).`
          });
        }
        leave.user = updatedUser;
      }
      // 2. Transitioning from approved to rejected -> refund previously deducted balance atomically
      else if (previousStatus === "approved" && status !== "approved") {
        const { update: decUpdate, targetKey } = buildAtomicBalanceDelta({
          targetYear,
          activeUserYear: freshUser.leaveYear,
          type: leave.type,
          isExtra: isExtraLeave,
          daysDelta: -leave.days
        });

        const updatedUser = await User.findByIdAndUpdate(
          leave.user._id,
          { $inc: decUpdate },
          { new: true }
        );

        if (updatedUser) {
          if (updatedUser.leaveBalance?.[targetKey]?.taken < 0) {
            updatedUser.leaveBalance[targetKey].taken = 0;
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
      const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
      const financeRecipients = isExtraLeave ? getFinanceEmails() : [];

      emailResult = await sendApprovalEmail({
        employeeEmail: leave.user.email,
        employeeName: leave.user.name || "Team Member",
        status,
        leave,
        rejectionReason: status === "rejected" ? rejectionReason : "",
        additionalRecipients: financeRecipients
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

    const leave = await Leave.findById(leaveId).populate("user");
    if (!leave) {
      return res.status(404).json({ message: "Leave record not found." });
    }

    const isPrivilegedAdmin = currentCaller.role === "admin" || currentCaller.role === "founder";

    // Verify ownership: only the owner or an admin/founder can cancel
    const isOwner = leave.user && leave.user._id.toString() === currentCaller._id.toString();
    if (!isOwner && !isPrivilegedAdmin) {
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

    // Approved leaves cannot be cancelled by employee (Admin/Founder override allowed)
    if (leave.status === "approved" && !isPrivilegedAdmin) {
      return res.status(400).json({
        message: "Approved leaves cannot be cancelled by employees. Please contact your Admin to cancel an approved leave."
      });
    }

    const previousStatus = leave.status;
    leave.cancelledFromStatus = previousStatus;
    leave.status = "cancelled";
    leave.cancelledAt = new Date();
    await leave.save();

    // If an Admin cancelled an already approved leave, refund the balance atomically
    if (previousStatus === "approved" && leave.user?._id) {
      const targetYear = new Date(leave.fromDate).getUTCFullYear();
      await ensureUserYearBalanceExists(leave.user._id, targetYear);

      const freshUser = await User.findById(leave.user._id);
      const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");

      const { update: decUpdate, targetKey } = buildAtomicBalanceDelta({
        targetYear,
        activeUserYear: freshUser.leaveYear,
        type: leave.type,
        isExtra: isExtraLeave,
        daysDelta: -leave.days
      });

      const updatedUser = await User.findByIdAndUpdate(
        leave.user._id,
        { $inc: decUpdate },
        { new: true }
      );
      if (updatedUser && updatedUser.leaveBalance?.[targetKey]?.taken < 0) {
        updatedUser.leaveBalance[targetKey].taken = 0;
        await updatedUser.save({ validateBeforeSave: false });
      }
    }

    // Dispatch cancellation email to Vertical Lead, teammates, admins, and finance (if extra leave)
    let emailResult = null;
    try {
      const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
      const { recipients, founderEmails } = await getNotificationRecipients(leave.user, {
        isExtraLeave
      });

      emailResult = await sendCancellationEmail({
        leave,
        employee: leave.user,
        cancelledBy: currentCaller,
        previousStatus,
        recipients,
        founderEmails
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

    // Authorization: User must be the owner, vertical lead of the same vertical, or admin/founder
    const isOwner = leave.user && leave.user._id.toString() === req.user._id.toString();
    const isPrivilegedAdmin = req.user.role === "admin" || req.user.role === "founder";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isOwner && !isPrivilegedAdmin && !isLead) {
      return res.status(403).json({ message: "Not authorized to resend cancellation email for this leave." });
    }

    // 5 seconds rate-limit cooldown
    const cooldown = checkEmailCooldown(leave.lastCancellationEmailAttemptAt, 5);
    if (cooldown.isRateLimited) {
      return res.status(429).json({
        message: cooldown.message,
        remainingSeconds: cooldown.remainingSeconds
      });
    }

    const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
    const { recipients, founderEmails } = await getNotificationRecipients(leave.user, {
      isExtraLeave
    });

    // Accurately determine the status this leave had prior to cancellation
    const previousStatus = leave.cancelledFromStatus || "pending";

    const emailResult = await sendCancellationEmail({
      leave,
      employee: leave.user,
      cancelledBy: req.user,
      previousStatus,
      recipients,
      founderEmails
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
    const isPrivilegedAdmin = currentLead.role === "admin" || currentLead.role === "founder";

    // Verify permission: Must be Vertical Lead, Admin, or Founder
    if (!currentLead.isVerticalLead && !isPrivilegedAdmin) {
      return res.status(403).json({ message: "Access denied. Vertical Leads and Admins only." });
    }

    // Target vertical selection: Only Admin/Founder can query other verticals; Leads are strictly locked to their own vertical
    const targetVertical = (isPrivilegedAdmin && req.query.vertical)
      ? req.query.vertical
      : currentLead.vertical;

    // 1. Fetch team members (Excluding soft-deleted members)
    const teamMembers = await User.find({
      vertical: targetVertical,
      isDeleted: { $ne: true }
    }).select("name email leaveBalance yearlyLeaveBalances leaveYear isVerticalLead jobRole");

    // 2. Base filter for leaves in this vertical (Excluding Lead's own requests)
    const baseFilter = {
      vertical: targetVertical,
      user: { $ne: currentLead._id }
    };

    const { status, year, month, balanceYear } = req.query;
    const filter = buildLeaveDateFilter({ year, month, status, baseFilter });

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

    const currentISTYear = getCurrentISTYear();
    const targetBalanceYear = balanceYear && balanceYear !== "all"
      ? parseInt(balanceYear, 10)
      : currentISTYear;
    const validBalanceYear = !isNaN(targetBalanceYear) ? targetBalanceYear : currentISTYear;

    const formattedTeamMembers = teamMembers.map((member) => {
      const yearBal = getLeaveBalanceForYear(member, validBalanceYear);
      return {
        _id: member._id,
        name: member.name,
        email: member.email,
        isVerticalLead: member.isVerticalLead,
        jobRole: member.jobRole,
        leaveBalance: yearBal,
        selectedBalanceYear: validBalanceYear
      };
    });

    const [totalPending, totalApproved, availableYears, totalFiltered, teamLeaves] = await Promise.all([
      Leave.countDocuments({ ...baseFilter, status: "pending" }),
      Leave.countDocuments({ ...baseFilter, status: "approved" }),
      getAvailableLeaveYears(baseFilter),
      Leave.countDocuments(filter),
      query.exec()
    ]);

    const yearsSet = new Set(availableYears);
    yearsSet.add(currentISTYear);
    yearsSet.add(currentISTYear + 1);
    const sortedAvailableYears = Array.from(yearsSet).sort((a, b) => b - a);

    res.json({
      vertical: targetVertical,
      totalTeamMembers: teamMembers.length,
      teamMembers: formattedTeamMembers,
      teamLeaves,
      selectedBalanceYear: validBalanceYear,
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
      availableYears: sortedAvailableYears
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. RESEND LEAVE NOTIFICATION EMAIL
exports.resendLeaveEmail = async (req, res) => {
  try {
    const { id } = req.params;

    const leave = await Leave.findById(id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    // Authorization: User must be the owner, vertical lead of the same vertical, or admin/founder
    const isOwner = leave.user && leave.user._id.toString() === req.user._id.toString();
    const isPrivilegedAdmin = req.user.role === "admin" || req.user.role === "founder";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isOwner && !isPrivilegedAdmin && !isLead) {
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
    const cooldown = checkEmailCooldown(leave.lastEmailAttemptAt, 5);
    if (cooldown.isRateLimited) {
      return res.status(429).json({
        message: cooldown.message,
        remainingSeconds: cooldown.remainingSeconds
      });
    }

    // Fetch active team & admin emails (excluding soft-deleted/deactivated users)
    const employee = leave.user;
    if (!employee || employee.isDeleted) {
      return res.status(400).json({ message: "Cannot resend email: Employee account is deactivated or deleted." });
    }

    const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
    const { recipients, founderEmails } = await getNotificationRecipients(employee, {
      isExtraLeave
    });

    // Re-dispatch email
    const emailResult = await sendLeaveEmail({
      leave,
      employee,
      recipients,
      founderEmails
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

    const leave = await Leave.findById(id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    // Authorization: User must be Admin, Founder, OR the Vertical Lead of this vertical
    const isPrivilegedAdmin = req.user.role === "admin" || req.user.role === "founder";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isPrivilegedAdmin && !isLead) {
      return res.status(403).json({ message: "Access denied. Only Admins, Founders, or the team's Vertical Lead can resend decision notifications." });
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
    const cooldown = checkEmailCooldown(leave.lastDecisionEmailAttemptAt, 5);
    if (cooldown.isRateLimited) {
      return res.status(429).json({
        message: cooldown.message,
        remainingSeconds: cooldown.remainingSeconds
      });
    }

    const employee = leave.user;
    if (!employee || !employee.email) {
      return res.status(400).json({ message: "Cannot send notification: Employee email not found." });
    }

    const isExtraLeave = Boolean(leave.isExtraLeave || leave.type === "extra");
    const financeRecipients = isExtraLeave ? getFinanceEmails() : [];

    // Dispatch decision email
    const emailResult = await sendApprovalEmail({
      employeeEmail: employee.email,
      employeeName: employee.name || "Team Member",
      status: leave.status,
      leave,
      rejectionReason: leave.status === "rejected" ? (leave.rejectionReason || "") : "",
      additionalRecipients: financeRecipients
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

// 9. GET EMPLOYEE LEAVE DETAILS & HISTORY (Used in Modals / Admin / Lead view)
exports.getEmployeeLeaveDetails = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch User to get leave balance and details
    const user = await User.findById(id).select("name email leaveBalance yearlyLeaveBalances leaveYear vertical");
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Authorization check: Must be Admin, Founder, the employee's Vertical Lead, or the employee themselves
    const isSelf = req.user._id.toString() === id;
    const isPrivilegedAdmin = req.user.role === "admin" || req.user.role === "founder";
    const isTheirLead = req.user.isVerticalLead && req.user.vertical === user.vertical;

    if (!isSelf && !isPrivilegedAdmin && !isTheirLead) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to view this employee's records."
      });
    }

    const currentISTYear = getCurrentISTYear();
    const queryYear = req.query.year;
    const isAllYears = queryYear === "all";
    const parsedYear = parseInt(queryYear, 10);
    const selectedYear = !isAllYears && !isNaN(parsedYear) ? parsedYear : currentISTYear;
    const targetBalance = getLeaveBalanceForYear(user, selectedYear);

    // 2. Fetch User's leaves filtered by selected year (or all years if year=all)
    let leaveFilter = { user: id };
    if (!isAllYears) {
      leaveFilter = buildLeaveDateFilter({ year: selectedYear, baseFilter: { user: id } });
    }

    const [leaves, availableYears] = await Promise.all([
      Leave.find(leaveFilter).sort({ fromDate: -1, createdAt: -1 }),
      getAvailableLeaveYears({ user: id })
    ]);

    // Ensure current year, next year, and any yearlyLeaveBalances keys are included
    const yearsSet = new Set(availableYears);
    yearsSet.add(currentISTYear);
    yearsSet.add(currentISTYear + 1);

    if (user.yearlyLeaveBalances) {
      const balanceKeys = typeof user.yearlyLeaveBalances.keys === "function"
        ? Array.from(user.yearlyLeaveBalances.keys())
        : Object.keys(user.yearlyLeaveBalances);
      balanceKeys.forEach((k) => {
        const num = parseInt(k, 10);
        if (!isNaN(num)) yearsSet.add(num);
      });
    }
    const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

    const formattedLeaves = leaves.map((leave) => {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);

      return {
        _id: leave._id,
        type: leave.type,
        days: leave.days,
        reason: leave.reason,
        status: leave.status || "pending",
        rejectionReason: leave.rejectionReason || "",
        isPastLeave: Boolean(leave.isPastLeave),
        month: from.toLocaleString("default", { month: "short", timeZone: "Asia/Kolkata" }),
        from: from.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }),
        to: to.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }),
        createdAt: leave.createdAt,
      };
    });

    // 3. Return structured object containing leaves, balance, and available years
    res.json({
      employee: { name: user.name, email: user.email },
      leaveBalance: targetBalance,
      selectedYear: isAllYears ? "all" : selectedYear,
      currentYear: currentISTYear,
      availableYears: sortedYears,
      leaves: formattedLeaves
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 10. GET LEAD REQUESTS (Admin Only: Fetch all leaves requested by Vertical Leads with server-side filters, pagination & availableYears)
exports.getLeadRequestsForAdmin = async (req, res) => {
  try {
    const { status, year, month, vertical } = req.query;

    // Find all users who are Vertical Leads
    const allLeads = await User.find({ isVerticalLead: true }).select("_id vertical");
    const allLeadIds = allLeads.map((l) => l._id);

    let filteredLeadIds = allLeadIds;
    if (vertical && vertical !== "all") {
      filteredLeadIds = allLeads.filter((l) => l.vertical === vertical).map((l) => l._id);
    }

    const baseFilter = { user: { $in: filteredLeadIds } };
    if (vertical && vertical !== "all") {
      baseFilter.vertical = vertical;
    }

    const filter = buildLeaveDateFilter({ year, month, status, baseFilter });

    const isPaginated = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const query = Leave.find(filter)
      .populate("user", "name email vertical")
      .sort({ createdAt: -1 });

    if (isPaginated) {
      query.skip(skip).limit(limit);
    }

    const [availableYears, pendingCount, totalFiltered, leadLeaves] = await Promise.all([
      getAvailableLeaveYears(baseFilter),
      Leave.countDocuments({ user: { $in: allLeadIds }, status: "pending" }),
      Leave.countDocuments(filter),
      query.exec()
    ]);

    res.json({
      leadLeaves,
      availableYears,
      pendingCount,
      pagination: {
        page,
        limit,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limit) || 1,
        hasNextPage: page < Math.ceil(totalFiltered / limit),
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

