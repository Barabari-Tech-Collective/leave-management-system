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
          emailAttempts: { $exists: false },
          emailStatus: { $exists: false }
        },
        { $set: { emailStatus: "sent", emailAttempts: 1 } }
      );
    } catch (migErr) {
      console.warn("Legacy leaves migration note:", migErr.message);
    }

    // Auto-migrate legacy users to initialize 2026 leaveYear and yearlyLeaveBalances
    try {
      const { performAnnualResetAllUsers } = require("../utils/leaveResetUtils");
      await performAnnualResetAllUsers();
    } catch (userMigErr) {
      console.warn("Legacy user leave initialization note:", userMigErr.message);
    }
  } catch (error) {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  }
};

module.exports = connectDB;