const express = require("express");
const ensureAuth = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

router.get("/managers", ensureAuth, async (req, res) => {
  const managers = await User.find({ role: "manager" })
    .select("_id name");

  res.json(managers);
});

router.get("/me", ensureAuth, async (req, res) => {
  res.json(req.user);
});

router.get("/all", ensureAuth, async (req, res) => {
  try {
    const users = await User.find({ role: "employee" })
      .select("name email leaveBalance");

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;