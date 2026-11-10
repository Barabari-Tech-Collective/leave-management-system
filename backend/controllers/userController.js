const mongoose = require("mongoose");
const User = require("../models/User");
const Leave = require("../models/Leave");
const {
  getCurrentISTYear,
  getLeaveBalanceForYear,
  checkAndResetAnnualLeave,
  performAnnualResetAllUsers
} = require("../utils/leaveResetUtils");
const { getAvailableLeaveYears } = require("../utils/leaveFilterUtils");

// 1. GET all vertical leads
exports.getLeads = async (req, res) => {
  try {
    const leads = await User.find({ isVerticalLead: true, isDeleted: { $ne: true } })
      .select("_id name email vertical");
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 2. GET current logged-in user profile (Supports ?year= query to view historical/advance year balances)
exports.getMe = async (req, res) => {
  try {
    const user = await checkAndResetAnnualLeave(req.user);
    const currentISTYear = getCurrentISTYear();
    const queryYear = req.query.year ? parseInt(req.query.year, 10) : currentISTYear;
    const selectedYear = !isNaN(queryYear) ? queryYear : currentISTYear;

    const [availableYears, targetBalance] = await Promise.all([
      getAvailableLeaveYears({ user: user._id }),
      Promise.resolve(getLeaveBalanceForYear(user, selectedYear))
    ]);

    const userObj = user.toObject ? user.toObject({ flattenMaps: true }) : { ...user };
    userObj.leaveBalance = targetBalance;
    userObj.activeLeaveYear = user.leaveYear || currentISTYear;
    userObj.currentYear = currentISTYear;
    userObj.selectedYear = selectedYear;
    userObj.availableYears = availableYears;
    userObj.isHistoricalYear = selectedYear < currentISTYear;
    userObj.isAdvanceYear = selectedYear > currentISTYear;

    res.json(userObj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 3. GET all active users (Excludes soft-deleted members & current logged-in user)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.user._id },
      isDeleted: { $ne: true }
    })
      .select("name email role leaveBalance vertical isVerticalLead jobRole")
      .sort({ name: 1 });

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 4. Update Vertical Lead Status (Admins Only - Protected by requireAdmin middleware)
exports.updateLead = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    const { isVerticalLead, vertical } = req.body;
    const userId = req.params.id;

    // Single Lead Enforcement: Demote any existing lead in this vertical
    if (isVerticalLead) {
      await User.updateMany(
        { vertical, _id: { $ne: userId } },
        { $set: { isVerticalLead: false } }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { isVerticalLead, vertical },
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 5. Update Employee Vertical & Migrate Leave Records (Admins Only - Protected by requireAdmin middleware)
exports.updateVertical = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    const { vertical } = req.body;
    const validVerticals = ["Program", "Placement", "EdTech", "Operations"];

    if (!validVerticals.includes(vertical)) {
      return res.status(400).json({ message: "Invalid vertical selection." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update user's vertical and revoke lead status on vertical change
    user.vertical = vertical;
    user.isVerticalLead = false; 
    await user.save({ validateBeforeSave: false });

    // MIGRATION: Sync all of this user's leave records to the new vertical!
    await Leave.updateMany({ user: user._id }, { $set: { vertical } });

    res.json({ message: `Reassigned ${user.name} to ${vertical} Vertical`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 6. Soft Delete User (Admins Only - Protected by requireAdmin middleware)
exports.softDeleteUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot deactivate your own admin account." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isDeleted = true;
    user.isVerticalLead = false; // Revoke lead access
    await user.save({ validateBeforeSave: false });

    res.json({ message: `Member ${user.name} removed successfully.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 7. GET all soft-deleted users (Recycle Bin - Admins Only - Protected by requireAdmin middleware)
exports.getDeletedUsers = async (req, res) => {
  try {
    const deletedUsers = await User.find({ isDeleted: true })
      .select("name email role vertical jobRole updatedAt")
      .sort({ updatedAt: -1 });

    res.json(deletedUsers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 8. Restore Soft-Deleted User (Admins Only - Protected by requireAdmin middleware)
exports.restoreUser = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid user ID format." });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.isDeleted = false;
    await user.save({ validateBeforeSave: false });

    res.json({ message: `Account for ${user.name} restored successfully!`, user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 9. Manual Annual Leave Reset (Admins Only)
exports.resetAnnualLeaves = async (req, res) => {
  try {
    const targetYear = req.body.targetYear ? parseInt(req.body.targetYear, 10) : null;
    const result = await performAnnualResetAllUsers(targetYear);
    res.json({
      message: `Annual leave reset successfully executed for year ${result.targetYear}`,
      result
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
