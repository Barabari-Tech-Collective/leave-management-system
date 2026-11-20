const mongoose = require("mongoose");

/**
 * Middleware to validate the MongoDB ObjectId in req.params.id.
 * Always used directly as route middleware: router.put("/:id", validateObjectId, handler)
 */
const validateObjectId = (req, res, next) => {
  const id = req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid or malformed ID format." });
  }
  next();
};

module.exports = validateObjectId;
