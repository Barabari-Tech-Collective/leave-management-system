const express = require("express");
const passport = require("passport");

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
    failureRedirect: "https://main.dj1fda2afc0ys.amplifyapp.com/"
  }),
  (req, res) => {
    console.log("SUCCESS USER:", req.user);
    // res.redirect("http://localhost:5173/employee");
    // res.redirect("https://main.dj1fda2afc0ys.amplifyapp.com");
    if (req.user.role === "admin") {
  res.redirect("https://main.dj1fda2afc0ys.amplifyapp.com/admin");
} else {
  res.redirect("https://main.dj1fda2afc0ys.amplifyapp.com/employee");
}
  }
);

// Get logged-in user
router.get("/me", (req, res) => {
  console.log("SESSION USER:", req.user); // 👈 ADD THIS
  if (!req.user) {
    return res.status(401).json(null); // ✅ instead of undefined
  }
  res.json(req.user);
});

// Logout
router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });
});
module.exports = router;