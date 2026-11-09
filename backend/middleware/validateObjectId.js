const mongoose = require("mongoose");

/**
 * Middleware to validate MongoDB ObjectId parameters in routes.
 * 
 * Usage:
 *  - Direct default ('id'): router.get("/:id", validateObjectId, handler)
 *  - Custom param name:     router.get("/:userId", validateObjectId("userId"), handler)
 */
const validateObjectId = (paramNameOrReq = "id", res, next) => {
  // If used directly as middleware: (req, res, next)
  if (paramNameOrReq && paramNameOrReq.params && typeof res === "object" && typeof next === "function") {
    const req = paramNameOrReq;
    const id = req.params.id;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid or malformed ID format." });
    }
    return next();
  }

  // If used as a factory: validateObjectId("paramName")
  const paramName = typeof paramNameOrReq === "string" ? paramNameOrReq : "id";
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: `Invalid or malformed ${paramName} format.` });
    }
    next();
  };
};

module.exports = validateObjectId;
