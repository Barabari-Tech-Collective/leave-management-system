// Middleware to protect routes
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    if (req.user && req.user.isDeleted) {
      return res.status(403).json({
        message: "Your account has been deactivated. Please contact your Admin."
      });
    }
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

module.exports = ensureAuth;