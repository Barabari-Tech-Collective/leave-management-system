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
 * Checks if user's active leaveYear is behind current IST year.
 * If so, archives previous year's balance, initializes new year balance, and updates user.
 * Also handles backward compatibility migration for existing legacy records.
 */
const checkAndResetAnnualLeave = async (user) => {
  if (!user || !user._id) return user;

  const currentISTYear = getCurrentISTYear();
  // Legacy production accounts default to year 2026 if leaveYear is uninitialized
  const userYear = user.leaveYear || 2026;

  // Initialize yearlyLeaveBalances map if missing
  if (!user.yearlyLeaveBalances) {
    user.yearlyLeaveBalances = new Map();
  }

  const userYearKey = String(userYear);
  const currentYearKey = String(currentISTYear);

  let needsSave = false;

  // Backward compatibility: ensure active year balance is stored in yearlyLeaveBalances
  let existingActiveRecord = getYearMapRecord(user, userYearKey);
  if (!existingActiveRecord && user.leaveBalance) {
    const cleanActive = sanitizeBalanceObject(user.leaveBalance);
    setYearMapRecord(user, userYearKey, cleanActive);
    needsSave = true;
  }

  // Backward compatibility: ensure legacy users have leaveYear initialized
  if (!user.leaveYear) {
    user.leaveYear = currentISTYear;
    needsSave = true;
  }

  // Backward compatibility: ensure extra field is present in active leaveBalance
  if (user.leaveBalance && (!user.leaveBalance.extra || typeof user.leaveBalance.extra.taken !== "number")) {
    user.leaveBalance.extra = { taken: 0 };
    needsSave = true;
  }

  // If user is already on current year, save if migrated and return
  if (userYear >= currentISTYear) {
    if (needsSave) {
      if (typeof user.markModified === "function") {
        user.markModified("yearlyLeaveBalances");
        user.markModified("leaveBalance");
      }
      await user.save({ validateBeforeSave: false });
    }
    return user;
  }

  // --- ANNUAL RESET TRIGGERED (Year has rolled over) ---
  console.log(`🔄 [Annual Leave Reset]: Rolling over user ${user.email} from ${userYear} to ${currentISTYear}...`);

  // 1. Archive previous year balance into yearlyLeaveBalances
  const archivedBalance = sanitizeBalanceObject(user.leaveBalance);
  setYearMapRecord(user, userYearKey, archivedBalance);

  // 2. Prepare new year balance: check if advance leaves were booked for currentISTYear
  let newYearBalance = getYearMapRecord(user, currentYearKey);
  if (newYearBalance) {
    newYearBalance = sanitizeBalanceObject(newYearBalance);
  } else {
    newYearBalance = getDefaultCategoryBalances();
  }

  // Save new year record in yearly map
  setYearMapRecord(user, currentYearKey, newYearBalance);

  // 3. Reset active leaveBalance and set active leaveYear to currentISTYear
  user.leaveBalance = newYearBalance;
  user.leaveYear = currentISTYear;

  if (typeof user.markModified === "function") {
    user.markModified("yearlyLeaveBalances");
    user.markModified("leaveBalance");
  }
  await user.save({ validateBeforeSave: false });
  console.log(`✅ [Annual Leave Reset]: User ${user.email} successfully reset for year ${currentISTYear}.`);

  return user;
};

/**
 * Ensures a user document has the yearlyLeaveBalances entry initialized for targetYear in MongoDB.
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

    setYearMapRecord(user, yearKey, defaultBal);

    if (typeof user.markModified === "function") {
      user.markModified("yearlyLeaveBalances");
    }
    await user.save({ validateBeforeSave: false });
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
      await checkAndResetAnnualLeave(user);
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
