const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    type: {
      type: String,
      enum: ["casual", "sick", "flexible"],
      required: true
    },
    fromDate: Date,
    toDate: Date,
    days: Number,
    reason: String
  },
  { timestamps: true }
);

module.exports = mongoose.model("Leave", leaveSchema);