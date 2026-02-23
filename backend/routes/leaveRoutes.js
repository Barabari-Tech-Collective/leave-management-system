const express = require("express");
const ensureAuth = require("../middleware/auth.middleware");
const { applyLeave, getMyleaves } = require("../controllers/leave.controller");

const router = express.Router();

router.post("/apply", ensureAuth, applyLeave);
router.get("/myleaves", ensureAuth, getMyleaves)

module.exports = router;