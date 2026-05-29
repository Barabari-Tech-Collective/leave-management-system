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
    failureRedirect: "https://leaveportal.barabaricollective.org/",
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
        return res.redirect(
          "https://leaveportal.barabaricollective.org/admin"
        );
      }

      return res.redirect(
        "https://leaveportal.barabaricollective.org/employee"
      );

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

// Get logged-in user
router.get("/me",ensureAuth, (req, res) => {
  console.log("SESSION USER:", req.user); // ADD THIS
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
  secure: true,
  sameSite: "none",
  domain: ".barabaricollective.org",
    });
      res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });
});
module.exports = router;