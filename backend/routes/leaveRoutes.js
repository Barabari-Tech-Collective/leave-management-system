const express = require("express");
const ensureAuth = require("../middleware/authMiddleware");
const { applyLeave, getMyleaves, updateLeaveStatus } = require("../controllers/leaveController");
const Leave = require("../models/Leave");


const router = express.Router();

router.post("/apply", ensureAuth, applyLeave);
router.get("/myleaves", ensureAuth, getMyleaves);

router.get("/employee/:id", ensureAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Employee ID missing" });
    }

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
        from: from.toLocaleDateString(),
        to: to.toLocaleDateString(),
      };
    });

    res.json(formattedLeaves);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/status/:id", ensureAuth, updateLeaveStatus);

module.exports = router;