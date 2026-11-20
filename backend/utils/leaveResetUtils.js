const User = require("../models/User");

/**
 * Returns the current calendar year in Indian Standard Time (Asia/Kolkata).
 */
const getCurrentISTYear = () => {
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric"
      }).format(new Date()),
      10
    );
  } catch (err) {
    return new Date().getFullYear();
  }
};

/**
 * Generates default annual leave allocation object.
 */
const getDefaultCategoryBalances = () => ({
  casual: { total: 11, taken: 0 },
  sick: { total: 10, taken: 0 },
  flexible: { total: 5, taken: 0 },
  national: { total: 4, taken: 0 },
  extra: { taken: 0 }
});

/**
 * Normalizes balance object to guarantee all expected fields exist with numeric values.
 */
const sanitizeBalanceObject = (bal = {}) => {
  const defaults = getDefaultCategoryBalances();
  return {
    casual: {
      total: Number(bal?.casual?.total ?? defaults.casual.total),
      taken: Math.max(0, Number(bal?.casual?.taken ?? 0))
    },
    sick: {
      total: Number(bal?.sick?.total ?? defaults.sick.total),
      taken: Math.max(0, Number(bal?.sick?.taken ?? 0))
    },
    flexible: {
      total: Number(bal?.flexible?.total ?? defaults.flexible.total),
      taken: Math.max(0, Number(bal?.flexible?.taken ?? 0))
    },
    national: {
      total: Number(bal?.national?.total ?? defaults.national.total),
      taken: Math.max(0, Number(bal?.national?.taken ?? 0))
    },
    extra: {
      taken: Math.max(0, Number(bal?.extra?.taken ?? 0))
    }
  };
};

/**
 * Helper to safely retrieve a year's balance record from user.yearlyLeaveBalances,
 * handling both Mongoose Map instances and plain JavaScript objects.
 */
const getYearMapRecord = (user, yearKey) => {
  if (!user || !user.yearlyLeaveBalances) return null;
  const key = String(yearKey);
  if (typeof user.yearlyLeaveBalances.get === "function") {
    return user.yearlyLeaveBalances.get(key) || null;
  }
  return user.yearlyLeaveBalances[key] || null;
};

/**
 * Helper to safely write a year's balance record into user.yearlyLeaveBalances,
 * handling both Mongoose Map instances and plain JavaScript objects.
 */
const setYearMapRecord = (user, yearKey, balanceData) => {
  if (!user) return;
  if (!user.yearlyLeaveBalances) {
    user.yearlyLeaveBalances = new Map();
  }
  const key = String(yearKey);
  if (typeof user.yearlyLeaveBalances.set === "function") {
    user.yearlyLeaveBalances.set(key, balanceData);
  } else {
    user.yearlyLeaveBalances[key] = balanceData;
  }
};

/**
 * Constructs MongoDB $inc update object for modifying leave taken count
 * across yearlyLeaveBalances and active leaveBalance atomically.
 */
const buildAtomicBalanceDelta = ({ targetYear, activeUserYear, type, isExtra = false, daysDelta }) => {
  const yearKey = String(targetYear);
  const targetKey = (isExtra || type === "extra") ? "extra" : type;
  const update = {
    [`yearlyLeaveBalances.${yearKey}.${targetKey}.taken`]: daysDelta
  };
  const isActiveYear = !activeUserYear || activeUserYear === targetYear;
  if (isActiveYear) {
    update[`leaveBalance.${targetKey}.taken`] = daysDelta;
  }
  return { update, targetKey, yearKey, isActiveYear };
};

/**
 * Retrieves leave balance for a user for a specific calendar year.
 * Checks yearlyLeaveBalances first; if missing, falls back to leaveBalance or initializes defaults.
 */
const getLeaveBalanceForYear = (user, targetYear) => {
  if (!user) return getDefaultCategoryBalances();
  const yearKey = String(targetYear);

  // 1. Check in yearlyLeaveBalances Map or plain object
  const yearRecord = getYearMapRecord(user, yearKey);
  if (yearRecord) {
    return sanitizeBalanceObject(yearRecord);
  }

  // 2. If targetYear matches user's active leaveYear, use user.leaveBalance
  const activeYear = user.leaveYear || getCurrentISTYear();
  if (parseInt(yearKey, 10) === activeYear && user.leaveBalance) {
    return sanitizeBalanceObject(user.leaveBalance);
  }

  // 3. Otherwise return fresh default allocation
  return getDefaultCategoryBalances();
};

/**
 * Fail-safe Lazy Rollover Guard.
 * Checks if user's active leaveYear is behind current IST year (or targetYear).
 * If so, archives previous year's balance, initializes new year balance, and updates user atomically.
 * Uses atomic conditional MongoDB operations ($set with leaveYear match) to prevent
 * overwriting concurrent balance adjustments.
 */
const checkAndResetAnnualLeave = async (user, targetYearOverride = null) => {
  if (!user || !user._id) return user;

  const currentISTYear = targetYearOverride || getCurrentISTYear();
  const freshUser = await User.findById(user._id);
  if (!freshUser) return user;

  // Legacy production accounts default to year 2026 if leaveYear is uninitialized
  const userYear = freshUser.leaveYear || 2026;
  const userYearKey = String(userYear);
  const currentYearKey = String(currentISTYear);

  // Backward compatibility: legacy accounts with uninitialized leaveYear
  if (!freshUser.leaveYear) {
    const cleanBalance = sanitizeBalanceObject(freshUser.leaveBalance);
    const updated = await User.findOneAndUpdate(
      {
        _id: freshUser._id,
        $or: [{ leaveYear: { $exists: false } }, { leaveYear: null }]
      },
      {
        $set: {
          leaveYear: currentISTYear,
          leaveBalance: cleanBalance,
          [`yearlyLeaveBalances.${currentYearKey}`]: cleanBalance,
          "leaveBalance.extra": freshUser.leaveBalance?.extra || { taken: 0 }
        }
      },
      { new: true }
    );
    return updated || (await User.findById(freshUser._id)) || freshUser;
  }

  // If user is already on or ahead of target year
  if (userYear >= currentISTYear) {
    const existingActiveRecord = getYearMapRecord(freshUser, userYearKey);
    const hasExtra = Boolean(freshUser.leaveBalance?.extra && typeof freshUser.leaveBalance.extra.taken === "number");

    if (!existingActiveRecord || !hasExtra) {
      const cleanActive = sanitizeBalanceObject(freshUser.leaveBalance);
      const updateFields = {};
      if (!existingActiveRecord) {
        updateFields[`yearlyLeaveBalances.${userYearKey}`] = cleanActive;
      }
      if (!hasExtra) {
        updateFields["leaveBalance.extra"] = { taken: 0 };
      }
      const updated = await User.findByIdAndUpdate(
        freshUser._id,
        { $set: updateFields },
        { new: true }
      );
      return updated || freshUser;
    }
    return freshUser;
  }

  // --- ANNUAL RESET TRIGGERED (Year has rolled over) ---
  console.log(`🔄 [Annual Leave Reset]: Rolling over user ${freshUser.email} from ${userYear} to ${currentISTYear}...`);

  // 1. Archive previous year balance
  const archivedBalance = sanitizeBalanceObject(freshUser.leaveBalance);

  // 2. Prepare new year balance: check if advance leaves were booked for currentISTYear
  const existingNewYearRecord = getYearMapRecord(freshUser, currentYearKey);
  const newYearBalance = existingNewYearRecord
    ? sanitizeBalanceObject(existingNewYearRecord)
    : getDefaultCategoryBalances();

  // 3. Atomically perform the rollover with a conditional update matching userYear (oldYear).
  // This guarantees it only executes once and never overwrites concurrent $inc deductions.
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: freshUser._id,
      leaveYear: userYear
    },
    {
      $set: {
        leaveYear: currentISTYear,
        leaveBalance: newYearBalance,
        [`yearlyLeaveBalances.${currentYearKey}`]: newYearBalance,
        [`yearlyLeaveBalances.${userYearKey}`]: archivedBalance
      }
    },
    { new: true }
  );

  if (updatedUser) {
    console.log(`✅ [Annual Leave Reset]: User ${freshUser.email} successfully reset for year ${currentISTYear}.`);
    return updatedUser;
  }

  // If update condition didn't match, another concurrent process already performed the reset
  return (await User.findById(freshUser._id)) || freshUser;
};

/**
 * Ensures a user document has the yearlyLeaveBalances entry initialized for targetYear in MongoDB.
 * Performs atomic conditional update with $exists: false to prevent race conditions.
 */
const ensureUserYearBalanceExists = async (userId, targetYear) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const yearKey = String(targetYear);
  const existingRecord = getYearMapRecord(user, yearKey);

  if (!existingRecord) {
    const defaultBal = getDefaultCategoryBalances();
    const activeYear = user.leaveYear || getCurrentISTYear();
    if (targetYear === activeYear && user.leaveBalance) {
      Object.assign(defaultBal, sanitizeBalanceObject(user.leaveBalance));
    }

    const updated = await User.findOneAndUpdate(
      {
        _id: userId,
        [`yearlyLeaveBalances.${yearKey}`]: { $exists: false }
      },
      {
        $set: { [`yearlyLeaveBalances.${yearKey}`]: defaultBal }
      },
      { new: true }
    );
    return updated || user;
  }

  return user;
};

/**
 * Resets all users whose leaveYear is behind currentISTYear or uninitialized.
 * Used by server boot auto-migration, scheduled midnight cron, and manual admin endpoint.
 */
const performAnnualResetAllUsers = async (targetYear = null) => {
  const currentISTYear = targetYear || getCurrentISTYear();
  console.log(`⏰ [Annual Leave Reset Engine]: Starting annual reset process for target year: ${currentISTYear}...`);

  // Find all active users where leaveYear is less than targetYear OR leaveYear is not set
  const usersToReset = await User.find({
    isDeleted: { $ne: true },
    $or: [
      { leaveYear: { $lt: currentISTYear } },
      { leaveYear: { $exists: false } },
      { leaveYear: null }
    ]
  });

  console.log(`ℹ️ [Annual Leave Reset Engine]: Found ${usersToReset.length} user(s) requiring annual initialization/rollover.`);

  let resetCount = 0;
  const errors = [];

  for (const user of usersToReset) {
    try {
      await checkAndResetAnnualLeave(user, currentISTYear);
      resetCount++;
    } catch (err) {
      console.error(`🚨 Failed to reset leaves for user ${user.email}:`, err);
      errors.push({ email: user.email, error: err.message });
    }
  }

  console.log(`🎉 [Annual Leave Reset Engine]: Completed rollover. Successfully reset/migrated ${resetCount}/${usersToReset.length} users.`);

  return {
    targetYear: currentISTYear,
    totalEligible: usersToReset.length,
    resetCount,
    errors
  };
};

module.exports = {
  getCurrentISTYear,
  getDefaultCategoryBalances,
  sanitizeBalanceObject,
  getYearMapRecord,
  setYearMapRecord,
  buildAtomicBalanceDelta,
  getLeaveBalanceForYear,
  ensureUserYearBalanceExists,
  checkAndResetAnnualLeave,
  performAnnualResetAllUsers
};
