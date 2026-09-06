const express = require("express");
const ensureAuth = require("../middleware/authMiddleware");
const User = require("../models/User");
const Leave = require("../models/Leave");

const router = express.Router();

// 1. GET all vertical leads
router.get("/leads", ensureAuth, async (req, res) => {
  try {
    const leads = await User.find({ isVerticalLead: true, isDeleted: { $ne: true } })
      .select("_id name email vertical");
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. GET current logged-in user profile
router.get("/me", ensureAuth, async (req, res) => {
  res.json(req.user);
});

// 3. GET all active users (Excludes soft-deleted members & current logged-in user)
router.get("/all", ensureAuth, async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      isDeleted: { $ne: true }
    })
      .select("name email role leaveBalance vertical isVerticalLead jobRole")
      .sort({ name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Update Vertical Lead Status (Used in Manage Leads Page)
router.put("/update-lead/:id", ensureAuth, async (req, res) => {
  try {
    const { isVerticalLead, vertical } = req.body;
    const userId = req.params.id;

    // Single Lead Enforcement: Demote any existing lead in this vertical
    if (isVerticalLead) {
      await User.updateMany(
        { vertical, _id: { $ne: userId } },
        { $set: { isVerticalLead: false } }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isVerticalLead, vertical },
      { new: true }
    );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 5. Update Employee Vertical & Migrate Leave Records (Used in Manage Verticals Page)
router.put("/update-vertical/:id", ensureAuth, async (req, res) => {
  try {
    const { vertical } = req.body;
    const validVerticals = ["Program", "Placement", "EdTech", "Operations"];

    if (!validVerticals.includes(vertical)) {
      return res.status(400).json({ message: "Invalid vertical selection." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update user's vertical and revoke lead status on vertical change
    user.vertical = vertical;
    user.isVerticalLead = false; 
    await user.save({ validateBeforeSave: false });

    // MIGRATION: Sync all of this user's leave records to the new vertical!
    await Leave.updateMany({ user: user._id }, { $set: { vertical } });

    res.json({ message: `Reassigned ${user.name} to ${vertical} Vertical`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 6. Soft Delete User
router.put("/soft-delete/:id", ensureAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isDeleted = true;
    user.isVerticalLead = false; // Revoke lead access
    await user.save({ validateBeforeSave: false });

    res.json({ message: `Member ${user.name} removed successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;