const Leave = require("../models/Leave");
const User = require("../models/User.js");
const sendLeaveEmail = require("../services/emailService");

exports.applyLeave = async (req, res) => {
  try {
    const user = req.user;
    const { type, fromDate, toDate, reason, managerId } = req.body;

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const days = (end - start) / (1000 * 60 * 60 * 24) + 1;

    const balance = user.leaveBalance[type];
    const remaining = balance.total - balance.taken;

    if (days > remaining) {
      return res.status(400).json({ message: "Not enough leave balance" });
    }

    // Fetch selected manager
    const manager = await User.findById(managerId);
    if (!manager || manager.role !== "manager") {
      return res.status(400).json({ message: "Invalid manager selected" });
    }

    // Fetch founder
    const founder = await User.findOne({ role: "founder" });

    // Fetch admin
    const admin = await User.findOne({ role: "admin" });

    const leave = await Leave.create({
      user: user._id,
      type,
      fromDate,
      toDate,
      days,
      reason
    });

    user.leaveBalance[type].taken += days;
    await user.save();

    // Send email
    await sendLeaveEmail({
      leave,
      employee: user,
      managerEmail: manager.email,
      founderEmail: founder?.email,
      adminEmail: admin?.email
    });

    res.json({ message: "Leave applied successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};