const Leave = require("../models/Leave");
const User = require("../models/User");
const { sendLeaveEmail, sendApprovalEmail } = require("../services/emailService");

// 1. APPLY LEAVE (Notifies Vertical Lead, Teammates & Admins)
exports.applyLeave = async (req, res) => {
  try {
    const user = req.user;
    const { type, fromDate, toDate, reason } = req.body;

    // Calculate total days excluding Sundays
    let start = new Date(fromDate);
    let end = new Date(toDate);
    let days = 0;
    let current = new Date(start);

    while (current <= end) {
      if (current.getDay() !== 0) { // Skip Sundays (0)
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    if (days <= 0) {
      return res.status(400).json({ message: "No working days selected (Sundays excluded)." });
    }

    const balance = user.leaveBalance[type];
    const remaining = balance.total - balance.taken;

    if (days > remaining) {
      return res.status(400).json({ message: `Not enough leave balance. Required: ${days}, Remaining: ${remaining}` });
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

    // C. Create Leave record with initial emailStatus: 'pending'
    const leave = await Leave.create({
      user: user._id,
      vertical: user.vertical,
      type,
      fromDate,
      toDate,
      days,
      reason,
      emailStatus: "pending",
      emailAttempts: 0
    });

    // D. Send Email
    const emailResult = await sendLeaveEmail({
      leave,
      employee: user,
      recipients: [...teamEmails, ...adminEmails],
      founderEmails: process.env.FOUNDER_EMAILS || "harihar@barabaricollective.org"
    });

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
      message: "Leave applied successfully",
      leave,
      emailSent: leave.emailStatus === "sent"
    });
  } catch (error) {
    console.log("Error applying leave:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. GET MY LEAVES (For logged-in employee)
exports.getMyleaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user._id }).sort({ createdAt: -1 });

    const formattedLeaves = leaves.map((leave) => {
      const from = new Date(leave.fromDate);
      const to = new Date(leave.toDate);

      // Handle legacy leaves: if email tracking fields are absent or attempts is 0, treat as already 'sent'
      const isLegacy = !leave.emailAttempts || leave.emailAttempts === 0;
      const computedEmailStatus = isLegacy ? "sent" : (leave.emailStatus || "sent");

      return {
        _id: leave._id,
        type: leave.type,
        days: leave.days,
        reason: leave.reason,
        month: from.toLocaleString("default", { month: "short" }),
        from: from.toLocaleDateString("en-GB"),
        to: to.toLocaleDateString("en-GB"),
        status: leave.status || "pending",
        emailStatus: computedEmailStatus,
        emailAttempts: leave.emailAttempts || 0,
        emailError: leave.emailError || "",
        lastEmailAttemptAt: leave.lastEmailAttemptAt || null
      };
    });

    res.json(formattedLeaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. UPDATE LEAVE STATUS (Approve / Reject)
exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave record not found" });
    }

    leave.status = status;
    await leave.save();

    // Deduct leave balance only if approved
    if (status === "approved") {
      if (leave.user && leave.user.leaveBalance && leave.user.leaveBalance[leave.type]) {
        leave.user.leaveBalance[leave.type].taken += leave.days;
        // Save without triggering strict user re-validation
        await leave.user.save({ validateBeforeSave: false });
      }
    }

    // Dispatch status notification email (Approved or Rejected)
    if (leave.user && leave.user.email) {
      await sendApprovalEmail({
        employeeEmail: leave.user.email,
        employeeName: leave.user.name || "Team Member",
        status,
        leave,
        rejectionReason: status === "rejected" ? rejectionReason : ""
      });
    }

    res.json({ message: `Leave application ${status} successfully!`, leave });
  } catch (err) {
    console.error("Error updating leave status:", err);
    res.status(500).json({ message: err.message });
  }
};
// 4. VERTICAL LEAD DASHBOARD: Get Team Leaves & Statistics
exports.getTeamLeavesForLead = async (req, res) => {
  try {
    const currentLead = req.user;

    // Verify permission: Must be Vertical Lead or Admin
    if (!currentLead.isVerticalLead && currentLead.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Vertical Leads only." });
    }

    // Target vertical selection (Admin query override or Lead's own vertical)
    const targetVertical = req.query.vertical || currentLead.vertical;

    // 1. Fetch team members (Excluding soft-deleted members)
    const teamMembers = await User.find({
      vertical: targetVertical,
      isDeleted: { $ne: true }
    }).select("name email leaveBalance isVerticalLead jobRole");

    // 2. Fetch team leaves EXCLUDING the logged-in user's own requests
    // (Lead's own leave request goes to Admin Dashboard)
    const teamLeaves = await Leave.find({
      vertical: targetVertical,
      user: { $ne: currentLead._id } // <--- EXCLUDES LEAD'S OWN LEAVE APPLICATIONS
    })
      .populate("user", "name email leaveBalance vertical isVerticalLead")
      .sort({ createdAt: -1 });

    res.json({
      vertical: targetVertical,
      totalTeamMembers: teamMembers.length,
      teamMembers,
      teamLeaves
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

    // Authorization: User must be the owner, vertical lead of the same vertical, or admin
    const isOwner = leave.user && leave.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    const isLead = req.user.isVerticalLead && req.user.vertical === leave.vertical;

    if (!isOwner && !isAdmin && !isLead) {
      return res.status(403).json({ message: "Not authorized to resend email for this leave" });
    }

    // Resend is only available after a failed dispatch.
    if (leave.emailStatus !== "failed") {
      return res.status(400).json({
        message: "Email retry is only available for failed email notifications.",
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
      founderEmails: process.env.FOUNDER_EMAILS || "harihar@barabaricollective.org"
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
