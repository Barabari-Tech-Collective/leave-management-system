const User = require("../models/User");
const { sendWelcomeEmail } = require("../services/emailService");

// Google Callback Handler
exports.googleCallback = (req, res, next) => {
  const FRONTEND_URL = (process.env.FRONTEND_URL || "https://leaveportal.barabaricollective.org").replace(/\/+$/, "");

  req.session.save((err) => {
    if (err) {
      console.error("SESSION SAVE ERROR:", err);
      return next(err);
    }

    // 1. Redirect Admin or Founder to Admin dashboard
    if (req.user.role === "admin" || req.user.role === "founder") {
      return res.redirect(`${FRONTEND_URL}/admin`);
    }

    // 2. Redirect Vertical Lead
    if (req.user.isVerticalLead) {
      return res.redirect(`${FRONTEND_URL}/employee/team`);
    }

    // 3. Default Employee
    return res.redirect(`${FRONTEND_URL}/employee`);
  });
};

// Manual Email + Password Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    // Guard: Block soft-deleted employees from logging in
    if (user && user.isDeleted) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact your Admin."
      });
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Establish Passport Login Session
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Session login error" });
      }
      const safeUser = user.toObject ? user.toObject() : { ...user };
      delete safeUser.password;
      return res.json({ message: "Login successful", user: safeUser });
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Create User (Accessible by Admin and Vertical Leads)
exports.createUser = async (req, res) => {
  try {
    const creator = req.user;
    const { name, email, password, vertical, isVerticalLead, role, jobRole } = req.body;

    const isPrivilegedAdmin = creator.role === "admin" || creator.role === "founder";

    if (!creator.isVerticalLead && !isPrivilegedAdmin) {
      return res.status(403).json({ message: "Access denied. Only Admins, Founders, or Vertical Leads can create users." });
    }

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Full name is required." });
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email address is required." });
    }

    if (!password || typeof password !== "string" || !password.trim()) {
      return res.status(400).json({ message: "Temporary password is required." });
    }

    const cleanedEmail = email.trim().toLowerCase();

    // Standard Email Syntax Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanedEmail)) {
      return res.status(400).json({
        message: "Please provide a valid email address."
      });
    }

    // Existing user check
    const existingUser = await User.findOne({ email: cleanedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email address already exists." });
    }

    let assignedVertical = vertical;
    let assignedRole = role || "employee";
    let assignedLeadStatus = isVerticalLead || false;

    // Privilege Guard: Only Admins or Founders can appoint Vertical Leads or create non-employee roles
    if (!isPrivilegedAdmin) {
      assignedVertical = creator.vertical;
      assignedRole = "employee";
      assignedLeadStatus = false;
    }

    const newUser = await User.create({
      name,
      email: cleanedEmail,
      password,
      vertical: assignedVertical || "Program",
      isVerticalLead: assignedLeadStatus,
      role: assignedRole,
      jobRole: jobRole || ""
    });

    // Send Welcome Email asynchronously and check status
    let isEmailSent = false;
    try {
      isEmailSent = await sendWelcomeEmail({
        name: newUser.name,
        email: newUser.email,
        password: password,
        vertical: newUser.vertical,
        jobRole: newUser.jobRole
      });
    } catch (emailErr) {
      console.error("Failed to send welcome email:", emailErr);
    }

    res.status(201).json({
      message: `User created successfully!`,
      emailSent: isEmailSent,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        vertical: newUser.vertical
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get logged-in user profile
exports.getMe = (req, res) => {
  if (!req.user) {
    return res.status(401).json(null);
  }
  res.json(req.user);
};

// Reset Password
exports.resetPassword = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ message: "Email is required." });
    }
    if (!currentPassword) {
      return res.status(400).json({ message: "Current temporary password is required." });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters long." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
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
};

// Logout
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Logout failed" });
    }
    
    req.session.destroy(() => {
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax"
      };
      if (process.env.COOKIE_DOMAIN) {
        cookieOptions.domain = process.env.COOKIE_DOMAIN;
      }
      res.clearCookie("connect.sid", cookieOptions);
      res.status(200).json({
        message: "Logged out successfully",
      });
    });
  });
};
