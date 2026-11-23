const rateLimit = require("express-rate-limit");

/**
 * Rate limiter for login endpoint to prevent credential brute-forcing.
 * Max 15 attempts per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    message: "Too many login attempts from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false
  }
});

/**
 * Rate limiter for password reset endpoint to prevent spam and token brute-forcing.
 * Max 5 attempts per 15 minutes per IP.
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    message: "Too many password reset attempts. Please try again after 15 minutes."
  },
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false
  }
});

module.exports = {
  loginLimiter,
  resetPasswordLimiter
};
