const express = require("express");
const ensureAuth = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// GET all vertical leads
router.get("/leads", ensureAuth, async (req, res) => {
  try {
    const leads = await User.find({ isVerticalLead: true })
      .select("_id name email vertical");
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET logged-in user profile
router.get("/me", ensureAuth, async (req, res) => {
  res.json(req.user);
});

// GET all users (including vertical info for Admin tables)
router.get("/all", ensureAuth, async (req, res) => {
  try {
    const users = await User.find({ role: "employee" })
      .select("name email leaveBalance vertical isVerticalLead");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Toggle Vertical Lead status and assign Vertical (Used in Admin panel)
router.put("/update-lead/:id", ensureAuth, async (req, res) => {
  try {
    const { isVerticalLead, vertical } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerticalLead, ...(vertical && { vertical }) },
      { new: true }
    );

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;