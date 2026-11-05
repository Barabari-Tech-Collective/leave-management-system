const mongoose = require("mongoose");
const Leave = require("../models/Leave");

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // Auto-migrate legacy leaves created before email audit fields
    try {
      await Leave.updateMany(
        {
          $or: [
            { emailAttempts: { $exists: false } },
            { emailAttempts: 0, lastEmailAttemptAt: null }
          ]
        },
        { $set: { emailStatus: "sent", emailAttempts: 1 } }
      );
    } catch (migErr) {
      console.warn("Legacy leaves migration note:", migErr.message);
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;