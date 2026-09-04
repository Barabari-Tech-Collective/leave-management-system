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

    // A. Fetch Vertical Lead & Teammates in the same vertical
    const teamMembers = await User.find({
      vertical: user.vertical,
      _id: { $ne: user._id }
    });
    const teamEmails = teamMembers.map((member) => member.email);

    // B. Fetch Admins
    const envAdmins = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase());

    const dbAdmins = await User.find({ role: "admin" }).select("email");
    const dbAdminEmails = dbAdmins.map((admin) => admin.email);

    const adminEmails = Array.from(
      new Set([...dbAdminEmails, ...envAdmins].filter(Boolean))
    );

    // C. Create Leave record
    const leave = await Leave.create({
      user: user._id,
      vertical: user.vertical,
      type,
      fromDate,
      toDate,
      days,
      reason
    });

    // D. Send Email
    await sendLeaveEmail({
      leave,
      employee: user,
      recipients: [...teamEmails, ...adminEmails],
      founderEmail: "harihar@barabaricollective.org"
    });

    res.json({ message: "Leave applied successfully", leave });
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

      return {
        _id: leave._id,
        type: leave.type,
        days: leave.days,
        reason: leave.reason,
        month: from.toLocaleString("default", { month: "short" }),
        from: from.toLocaleDateString("en-GB"),
        to: to.toLocaleDateString("en-GB"),
        status: leave.status || "pending"
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
    const { status } = req.body;
    const leave = await Leave.findById(req.params.id).populate("user");

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;
    await leave.save();

    // Deduct leave balance only upon approval
    if (status === "approved") {
      leave.user.leaveBalance[leave.type].taken += leave.days;
      await leave.user.save();
    }

    // Send status update email to employee
    await sendApprovalEmail({
      employeeEmail: leave.user.email,
      employeeName: leave.user.name,
      status,
      leave
    });

    res.json({ message: `Leave ${status}` });
  } catch (err) {
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

    // If request query provides a target vertical (e.g., when Admin checks a specific vertical dashboard)
    const targetVertical = req.query.vertical || currentLead.vertical;

    // Fetch leaves & team members for target vertical
    const teamLeaves = await Leave.find({ vertical: targetVertical })
      .populate("user", "name email leaveBalance vertical")
      .sort({ createdAt: -1 });

    const teamMembers = await User.find({ vertical: targetVertical }).select(
      "name email leaveBalance isVerticalLead"
    );

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