const express = require("express");
const mongoose = require("mongoose");
const ensureAuth = require("../middleware/authMiddleware");
const {
  applyLeave,
  getMyleaves,
  updateLeaveStatus,
  getTeamLeavesForLead,
  resendLeaveEmail,
  resendDecisionEmail
} = require("../controllers/leaveController");
const Leave = require("../models/Leave");
const User = require("../models/User"); // Import User model

const router = express.Router();

router.post("/apply", ensureAuth, applyLeave);
router.get("/myleaves", ensureAuth, getMyleaves);
router.post("/resend-email/:id", ensureAuth, resendLeaveEmail);

router.get("/employee/:id", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid or missing employee ID format." });
    }

    // 1. Fetch User to get leave balance and details
    const user = await User.findById(id).select("name email leaveBalance vertical");
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Authorization check: Must be Admin, the employee's Vertical Lead, or the employee themselves
    const isSelf = req.user._id.toString() === id;
    const isAdmin = req.user.role === "admin";
    const isTheirLead = req.user.isVerticalLead && req.user.vertical === user.vertical;

    if (!isSelf && !isAdmin && !isTheirLead) {
      return res.status(403).json({
        message: "Access denied. You are not authorized to view this employee's records."
      });
    }

    // 2. Fetch User's leaves
    const leaves = await Leave.find({ user: id }).sort({ createdAt: -1 });

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
        month: from.toLocaleString("default", { month: "short" }),
        from: from.toLocaleDateString("en-GB"),
        to: to.toLocaleDateString("en-GB"),
        createdAt: leave.createdAt,
      };
    });

    // 3. Return structured object containing both leaves and balance
    res.json({
      employee: { name: user.name, email: user.email },
      leaveBalance: user.leaveBalance,
      leaves: formattedLeaves
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/update-status/:id", ensureAuth, updateLeaveStatus);
router.post("/resend-decision-email/:id", ensureAuth, resendDecisionEmail);
router.get("/team-dashboard", ensureAuth, getTeamLeavesForLead);

// GET /leave/lead-requests (Admin Only: Fetch all leaves requested by Vertical Leads)
router.get("/lead-requests", ensureAuth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }

    // Find all users who are Vertical Leads
    const leads = await User.find({ isVerticalLead: true }).select("_id");
    const leadIds = leads.map((l) => l._id);

    // Fetch leaves requested by leads
    const leadLeaves = await Leave.find({ user: { $in: leadIds } })
      .populate("user", "name email vertical")
      .sort({ createdAt: -1 });

    res.json(leadLeaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// testing
// const { sendNationalHolidayEmail } = require("../services/emailService");
// const User = require("../models/User");

// router.get("/test-holiday-email", async (req, res) => {
//   try {
//     const users = await User.find().select("email");
//     const allEmails = users.map((u) => u.email).filter(Boolean);

//     await sendNationalHolidayEmail(
//       "Test Holiday (Republic Day)",
//       "Monday, 26 January 2026",
//       allEmails
//     );

//     res.json({ message: "Test holiday email dispatched to org!", emailsSentTo: allEmails });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

module.exports = router;