const express = require("express");
const passport = require("passport");
const { ensureAuth, requireLeadOrAdmin } = require("../middleware/authMiddleware");
const authController = require("../controllers/authController");

const router = express.Router();
const FRONTEND_URL = (process.env.FRONTEND_URL || "https://leaveportal.barabaricollective.org").replace(/\/+$/, "");

// 1. Google Auth Initiator
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

// 2. Google Auth Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/?error=unauthorized`,
  }),
  authController.googleCallback
);

// 3. Manual Email + Password Login
router.post("/login", authController.login);

// 4. Create User (Accessible by Admin and Vertical Leads)
router.post("/create-user", ensureAuth, requireLeadOrAdmin, authController.createUser);

// 5. Get logged-in user profile
router.get("/me", ensureAuth, authController.getMe);

// 6. Reset Password Route
router.post("/reset-password", authController.resetPassword);

// 7. Logout
router.post("/logout", authController.logout);

module.exports = router;
