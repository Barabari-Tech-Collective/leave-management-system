const express = require("express");
const { ensureAuth, requireAdmin } = require("../middleware/authMiddleware");
const validateObjectId = require("../middleware/validateObjectId");
const userController = require("../controllers/userController");

const router = express.Router();

// 1. GET all vertical leads
router.get("/leads", ensureAuth, userController.getLeads);

// 2. GET current logged-in user profile
router.get("/me", ensureAuth, userController.getMe);

// 3. GET all active users (Excludes soft-deleted members & current logged-in user)
router.get("/all", ensureAuth, userController.getAllUsers);

// 4. Update Vertical Lead Status (Admins Only)
router.put("/update-lead/:id", ensureAuth, requireAdmin, validateObjectId, userController.updateLead);

// 5. Update Employee Vertical & Migrate Leave Records (Admins Only)
router.put("/update-vertical/:id", ensureAuth, requireAdmin, validateObjectId, userController.updateVertical);

// 6. Soft Delete User (Admins Only)
router.put("/soft-delete/:id", ensureAuth, requireAdmin, validateObjectId, userController.softDeleteUser);

// 7. GET all soft-deleted users (Recycle Bin - Admins Only)
router.get("/deleted", ensureAuth, requireAdmin, userController.getDeletedUsers);

// 8. Restore Soft-Deleted User (Admins Only)
router.put("/restore/:id", ensureAuth, requireAdmin, validateObjectId, userController.restoreUser);

// 9. Manual Annual Leave Reset (Admins Only)
router.post("/reset-annual-leaves", ensureAuth, requireAdmin, userController.resetAnnualLeaves);

module.exports = router;
