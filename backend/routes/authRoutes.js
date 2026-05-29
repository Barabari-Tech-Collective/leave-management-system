const express = require("express");
const passport = require("passport");
const ensureAuth = require("../middleware/authMiddleware");

const router = express.Router();

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
    failureRedirect: `${process.env.FRONTEND_URL}/`,
  }),
  (req, res, next) => {

    console.log("SUCCESS USER:", req.user);

    req.session.save((err) => {

      if (err) {
        console.log("SESSION SAVE ERROR:", err);
        return next(err);
      }

      console.log("SESSION SAVED SUCCESSFULLY");

      if (req.user.role === "admin") {
        return res.redirect(`${process.env.FRONTEND_URL}/admin`);
      }

      return res.redirect(`${process.env.FRONTEND_URL}/employee`);

    });
  }
);
// router.get(
//   "/google/callback",
//   passport.authenticate("google", {
//     failureRedirect: "https://leaveportal.barabaricollective.org/"
//   }),
//   (req, res) => {
//     console.log("SUCCESS USER:", req.user);
    // res.redirect("http://localhost:5173/employee");
    // res.redirect("https://main.dj1fda2afc0ys.amplifyapp.com");
//     if (req.user.role === "admin") {
//   res.redirect("https://leaveportal.barabaricollective.org/admin");
// } else {
//   res.redirect("https://leaveportal.barabaricollective.org/employee");
// }
//   }
// );

// ⚠️ TEMPORARY DEBUG ROUTE - remove after fixing
router.get("/debug", (req, res) => {
  console.log("=== DEBUG /auth/debug ===");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("Cookie header:", req.headers.cookie);
  console.log("SessionID:", req.sessionID);
  console.log("Session:", req.session);
  console.log("isAuthenticated:", req.isAuthenticated());
  console.log("User:", req.user);
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    hasCookie: !!req.headers.cookie,
    cookieHeader: req.headers.cookie,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    user: req.user || null
  });
});

// Get logged-in user
router.get("/me", ensureAuth, (req, res) => {
  console.log("SESSION USER:", req.user); // ADD THIS

  console.log("SESSION:", req.session);
  console.log("SESSION ID:", req.sessionID);
  console.log("USER:", req.user);
  console.log("IS AUTH:", req.isAuthenticated());
  if (!req.user) {
    return res.status(401).json(null); // instead of undefined
  }
  res.json(req.user);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
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