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
    failureRedirect: "https://main.d3s5m69z7c8esz.amplifyapp.com/"
  }),
  (req, res) => {
    console.log("SUCCESS USER:", req.user);
    // res.redirect("http://localhost:5173/employee");
    if (req.user.role === "admin") {
  res.redirect(process.env.FRONTEND_URL + "/admin");
} else {
  res.redirect(process.env.FRONTEND_URL + "/employee");
}
  }
);

// Get logged-in user
router.get("/me", (req, res) => {
  console.log("SESSION USER:", req.user); // 👈 ADD THIS
  res.json(req.user);
});

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect(process.env.FRONTEND_URL);
  });
});

module.exports = router;