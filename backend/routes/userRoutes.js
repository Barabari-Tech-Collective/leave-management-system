const express = require("express");
const ensureAuth = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// 1. GET all vertical leads (For specific lead queries)
router.get("/leads", ensureAuth, async (req, res) => {
  try {
    const leads = await User.find({ isVerticalLead: true })
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

// 3. GET all users for Admin management (Fetches ALL team members & leads)
router.get("/all", ensureAuth, async (req, res) => {
  try {
    // Exclude current logged-in user from list, return all users
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select("name email role leaveBalance vertical isVerticalLead")
      .sort({ name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Update Vertical and Lead status (Used in Admin panel)
router.put("/update-lead/:id", ensureAuth, async (req, res) => {
  try {
    const { isVerticalLead, vertical } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isVerticalLead, 
        vertical: vertical || "None" 
      },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;