// 1. Authentication Guard: Ensures user is authenticated and not deactivated
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

// 2. Role Guard: Admins & Founders Only
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin" && req.user?.role !== "founder") {
    return res.status(403).json({
      message: "Access denied. Only Admins or Founders can perform this action."
    });
  }
  next();
};

// 3. Role Guard: Vertical Leads, Admins, or Founders
const requireLeadOrAdmin = (req, res, next) => {
  const isPrivileged = req.user?.isVerticalLead || req.user?.role === "admin" || req.user?.role === "founder";
  if (!isPrivileged) {
    return res.status(403).json({
      message: "Access denied. Only Admins, Founders, or Vertical Leads can perform this action."
    });
  }
  next();
};

// Attach sub-middlewares for backwards-compatible object or function imports
ensureAuth.ensureAuth = ensureAuth;
ensureAuth.requireAdmin = requireAdmin;
ensureAuth.requireLeadOrAdmin = requireLeadOrAdmin;

module.exports = ensureAuth;
