const mongoose = require("mongoose");

const leaveBalanceSchema = {
  casual: { total: { type: Number, default: 15 }, taken: { type: Number, default: 0 } },
  sick: { total: { type: Number, default: 10 }, taken: { type: Number, default: 0 } },
  flexible: { total: { type: Number, default: 5 }, taken: { type: Number, default: 0 } }
};

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    googleId: String,

    vertical: {
      type: String,
      enum: ["Program", "Placement", "EdTech", "Operations", "None"],
      default: "None"
    },

    // Identify if the user leads a vertical
    isVerticalLead: {
      type: Boolean,
      default: false
    },

    role: {
      type: String,
      enum: ["employee", "admin", "founder"],
      default: "employee"
    },

    leaveBalance: leaveBalanceSchema
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);