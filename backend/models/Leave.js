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
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending"
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    cancelledAt: {
      type: Date
    },
    isPastLeave: {
      type: Boolean,
      default: false
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
    },
    decisionEmailStatus: {
      type: String,
      enum: ["none", "sent", "failed"],
      default: "none"
    },
    decisionEmailError: {
      type: String,
      default: ""
    },
    decisionEmailAttempts: {
      type: Number,
      default: 0
    },
    lastDecisionEmailAttemptAt: {
      type: Date
    },
    cancellationEmailStatus: {
      type: String,
      enum: ["none", "sent", "failed"],
      default: "none"
    },
    cancellationEmailError: {
      type: String,
      default: ""
    },
    cancellationEmailAttempts: {
      type: Number,
      default: 0
    },
    lastCancellationEmailAttemptAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);