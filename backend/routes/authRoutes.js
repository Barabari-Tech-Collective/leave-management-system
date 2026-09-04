const express = require("express");
const passport = require("passport");
const ensureAuth = require("../middleware/authMiddleware");
const User = require("../models/User.js");
const { sendWelcomeEmail } = require("../services/emailService");


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

// 3. Manual Email + Password Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Establish Passport Login Session
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Session login error" });
      }
      return res.json({ message: "Login successful", user });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Create User (Accessible by Admin and Vertical Leads)
router.post("/create-user", ensureAuth, async (req, res) => {
  try {
    const creator = req.user;
    const { name, email, password, vertical, isVerticalLead, role, jobRole } = req.body;

    // Permissions Guard: Must be Admin OR Vertical Lead
    if (!creator.isVerticalLead && creator.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Only Admins or Vertical Leads can create users." });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists." });
    }

    // Handle Vertical Lead creation limits (Leads can only create users inside their own vertical)
    let assignedVertical = vertical;
    let assignedRole = role || "employee";
    let assignedLeadStatus = isVerticalLead || false;

    if (creator.role !== "admin" && creator.isVerticalLead) {
      assignedVertical = creator.vertical;
      assignedRole = "employee"; // Vertical leads cannot create admins
    }

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      vertical: assignedVertical || "None",
      isVerticalLead: assignedLeadStatus,
      role: assignedRole,
      jobRole: jobRole || ""
    });

    // Send Welcome Email asynchronously
try {
  await sendWelcomeEmail({
    name: newUser.name,
    email: newUser.email,
    password: password, // Sending the unhashed plain password provided in modal
    vertical: newUser.vertical,
    jobRole: newUser.jobRole
  });
} catch (emailErr) {
  console.error("Failed to send welcome email:", emailErr);
}

    res.status(201).json({
      message: `User created successfully under ${assignedVertical} vertical!`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        vertical: newUser.vertical,
        role: newUser.role,
        jobRole: newUser.jobRole
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get logged-in user
router.get("/me", ensureAuth, (req, res) => {
  if (!req.user) {
    return res.status(401).json(null);
  }
  res.json(req.user);
});

// Reset Password Route
router.post("/reset-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    // Verify current temporary password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current/temporary password." });
    }

    // Update to new password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully! You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
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