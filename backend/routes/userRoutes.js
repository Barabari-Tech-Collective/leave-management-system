const express = require("express");
const ensureAuth = require("../middleware/auth.middleware");
const User = require("../models/User");

const router = express.Router();

router.get("/managers", ensureAuth, async (req, res) => {
  const managers = await User.find({ role: "manager" })
    .select("_id name");

  res.json(managers);
});

module.exports = router;