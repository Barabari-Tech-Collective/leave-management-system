const express = require("express");
const { ensureAuth, requireAdmin, requireLeadOrAdmin } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const {
  applyLeave,
  getMyleaves,
  updateLeaveStatus,
  cancelLeave,
  getTeamLeavesForLead,
  resendLeaveEmail,
  resendDecisionEmail,
  resendCancellationEmail,
  getEmployeeLeaveDetails,
  getLeadRequestsForAdmin
} = require("../controllers/leaveController");

const router = express.Router();

// Employee Self-Service Routes
router.post("/apply", ensureAuth, applyLeave);
router.get("/myleaves", ensureAuth, getMyleaves);
router.post("/resend-email/:id", ensureAuth, validateObjectId, resendLeaveEmail);
router.put("/cancel/:id", ensureAuth, validateObjectId, cancelLeave);
router.post("/resend-cancellation-email/:id", ensureAuth, validateObjectId, resendCancellationEmail);

// Vertical Lead & Admin Review Routes
router.get("/employee/:id", ensureAuth, validateObjectId, getEmployeeLeaveDetails);
router.put("/update-status/:id", ensureAuth, requireLeadOrAdmin, validateObjectId, updateLeaveStatus);
router.post("/resend-decision-email/:id", ensureAuth, requireLeadOrAdmin, validateObjectId, resendDecisionEmail);
router.get("/team-dashboard", ensureAuth, requireLeadOrAdmin, getTeamLeavesForLead);

// Admin-Only Lead Review Route
router.get("/lead-requests", ensureAuth, requireAdmin, getLeadRequestsForAdmin);

module.exports = router;
