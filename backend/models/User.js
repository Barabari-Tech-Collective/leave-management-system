const mongoose = require("mongoose");

const leaveBalanceSchema = {
  casual: { total: { type: Number, default: 11 }, taken: { type: Number, default: 0 } },
  sick: { total: { type: Number, default: 10 }, taken: { type: Number, default: 0 } },
  flexible: { total: { type: Number, default: 5 }, taken: { type: Number, default: 0 } }
};

const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    password: { type: String },
    googleId: String,
    jobRole: { type: String, default: "" },

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
  // 1. Automatically hash password before saving if modified
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// 2. Helper method to verify entered password during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.User || mongoose.model("User", userSchema);