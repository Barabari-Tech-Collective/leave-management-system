const express = require("express");
const passport = require("passport");
const ensureAuth = require("../middleware/authMiddleware");

const router = express.Router();
// Fallback frontend URL in case process.env.FRONTEND_URL is missing
const FRONTEND_URL = process.env.FRONTEND_URL || "https://leaveportal.barabaricollective.org";

// Start Google Auth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"]
  })
);

// Google Callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${FRONTEND_URL}/`,
  }),
  (req, res, next) => {
    console.log("SUCCESS USER:", req.user);

    req.session.save((err) => {
      if (err) {
        console.log("SESSION SAVE ERROR:", err);
        return next(err);
      }

      console.log("SESSION SAVED SUCCESSFULLY");

      // 1. Redirect Admin
      if (req.user.role === "admin") {
        return res.redirect(`${FRONTEND_URL}/admin`);
      }

      // 2. Redirect Vertical Lead
      if (req.user.isVerticalLead) {
        return res.redirect(`${FRONTEND_URL}/vertical-lead`);
      }

      // 3. Default Employee
      return res.redirect(`${FRONTEND_URL}/employee`);
    });
  }
);

// Get logged-in user
router.get("/me", ensureAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json(null);
  }
  res.json(req.user);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    
    req.session.destroy(() => {
      res.clearCookie("connect.sid", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
      });
      res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });
});

module.exports = router;