const express = require("express");
const ensureAuth = require("../middleware/authMiddleware");
const { applyLeave, getMyleaves, updateLeaveStatus, getTeamLeavesForLead } = require("../controllers/leaveController");
const Leave = require("../models/Leave");
const User = require("../models/User"); // Import User model

const router = express.Router();

router.post("/apply", ensureAuth, applyLeave);
router.get("/myleaves", ensureAuth, getMyleaves);

router.get("/employee/:id", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Employee ID missing" });
    }

    // 1. Fetch User to get leave balance and details
    const user = await User.findById(id).select("name email leaveBalance");
    if (!user) {
      return res.status(404).json({ message: "Employee not found" });
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
        month: from.toLocaleString("default", { month: "short" }),
        from: from.toLocaleDateString("en-GB"),
        to: to.toLocaleDateString("en-GB"),
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
router.get("/team-dashboard", ensureAuth, getTeamLeavesForLead);

// testing
const { sendNationalHolidayEmail } = require("../services/emailService");
const User = require("../models/User");

router.get("/test-holiday-email", async (req, res) => {
  try {
    const users = await User.find().select("email");
    const allEmails = users.map((u) => u.email).filter(Boolean);

    await sendNationalHolidayEmail(
      "Test Holiday (Republic Day)",
      "Monday, 26 January 2026",
      allEmails
    );

    res.json({ message: "Test holiday email dispatched to org!", emailsSentTo: allEmails });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;