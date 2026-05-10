const Leave = require("../models/Leave");
const User = require("../models/User");
const { sendLeaveEmail, sendApprovalEmail} = require("../services/emailService");

exports.applyLeave = async (req, res) => {
  try {
    const user = req.user;
    const { type, fromDate, toDate, reason, managerIds } = req.body;

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
    const managers = await User.find({
  _id: { $in: managerIds },
  isManager: true
});

if (!managers.length) {
  return res.status(400).json({ message: "No valid managers selected" });
}

const managerEmails = managers.map((m) => m.email);

    // Fetch founder
    // const founder = await User.findOne({ role: "founder" });

    // Fetch admin
    // const admin = await User.findOne({ role: "admin" });

    const leave = await Leave.create({
      user: user._id,
      type,
      fromDate,
      toDate,
      days,
      reason,
      managers: managerIds,
    });
    const admins = await User.find({ role: "admin" });

const adminEmails = admins.map((admin) => admin.email);
    // user.leaveBalance[type].taken += days;
    // await user.save();

    // Send email
    await sendLeaveEmail({
      leave,
      employee: user,
      // managerEmail: manager.email,
      managerEmails,
      founderEmail: "harihar@barabaricollective.org",
      // adminEmail: "karthik.krishnakumar7@gmail.com"
      adminEmails
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

    if (!leave) {
      return res.status(404).json({ message: "Leave not found" });
    }

    leave.status = status;

    await leave.save();

    // SEND EMAIL TO EMPLOYEE
    await sendApprovalEmail({
      employeeEmail: leave.user.email,
      employeeName: leave.user.name,
      status,
      leave
    });

    if (status === "approved") {
  leave.user.leaveBalance[leave.type].taken += leave.days;
  await leave.user.save();
}

    res.json({ message: `Leave ${status}` });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};