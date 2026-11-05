const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    vertical: {
      type: String,
      enum: ["Program", "Placement", "EdTech", "Operations"]
    },
    type: {
      type: String,
      enum: ["casual", "sick", "flexible", "national"],
      required: true
    },
    fromDate: Date,
    toDate: Date,
    days: Number,
    reason: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending"
    },
    emailStatus: {
      type: String,
      enum: ["pending", "sent", "failed"],
      default: "pending"
    },
    emailError: {
      type: String,
      default: ""
    },
    emailAttempts: {
      type: Number,
      default: 0
    },
    lastEmailAttemptAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);