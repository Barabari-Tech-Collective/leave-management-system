const Leave = require("../models/Leave");
const User = require("../models/User");
const sendLeaveEmail = require("../services/emailService");

exports.applyLeave = async (req, res) => {
  try {
    const user = req.user;
    const { type, fromDate, toDate, reason } = req.body;

    const start = new Date(fromDate);
    const end = new Date(toDate);

    const days = (end - start) / (1000 * 60 * 60 * 24) + 1;

    const balance = user.leaveBalance[type];
    const remaining = balance.total - balance.taken;

    if (days > remaining) {
      return res.status(400).json({ message: "Not enough leave balance" });
    }

    // Fetch selected manager
    // const manager = await User.findById(managerId);
    // if (!manager || manager.role !== "manager") {
    //   return res.status(400).json({ message: "Invalid manager selected" });
    // }

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
      // managerEmail: manager.email,
      founderEmail: "harihar@barabaricollective.org",
      adminEmail: "info@gmail.com"
    });

    res.json({ message: "Leave applied successfully" });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMyleaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ user: req.user._id })
      .sort({ createdAt: -1 });
      console.log("this is leaves", leaves);
      const formattedLeaves = leaves.map((leave) => {
  const from = new Date(leave.fromDate);
  const to = new Date(leave.toDate);

  return {
    _id: leave._id,
    type: leave.type,
    days: leave.days,
    reason: leave.reason,

    // 👇 formatted fields
    month: from.toLocaleString("default", { month: "short" }),
    from: from.toLocaleDateString("en-GB"),
    to: to.toLocaleDateString("en-GB"),

    status: leave.status || "pending" // default for now
  };
});

res.json(formattedLeaves);

    // res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.updateLeaveStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const leave = await Leave.findById(req.params.id).populate("user");

    leave.status = status;

    // If approved → deduct leave
    if (status === "approved") {
      // leave.user.leaveBalance[leave.type].taken += leave.days;
      await leave.user.save();
    }

    await leave.save();

    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};