const cron = require("node-cron");
const { performAnnualResetAllUsers } = require("../utils/leaveResetUtils");

/**
 * Scheduled Annual Leave Reset Cron.
 * Runs automatically on January 1st at 00:01:00 AM Indian Standard Time (Asia/Kolkata).
 * Cron pattern: "1 0 1 1 *" -> minute 1, hour 0 (00:01 IST), day 1, month 1 (January).
 */
const initAnnualResetCron = () => {
  cron.schedule(
    "1 0 1 1 *",
    async () => {
      try {
        console.log("==================================================");
        console.log("🎆 [NEW YEAR CRON]: January 1st Midnight reached (IST).");
        console.log("🎆 Initiating automated organization-wide Annual Leave Reset...");
        console.log("==================================================");

        const result = await performAnnualResetAllUsers();

        console.log("==================================================");
        console.log(`✅ [NEW YEAR CRON COMPLETED]: Reset ${result.resetCount}/${result.totalEligible} employee accounts.`);
        if (result.errors && result.errors.length > 0) {
          console.warn(`⚠️ [NEW YEAR CRON WARNINGS]: ${result.errors.length} errors encountered:`, result.errors);
        }
        console.log("==================================================");
      } catch (cronErr) {
        console.error("🚨 [Annual Reset Cron Error]: Unhandled exception in annual leave reset cron job:", cronErr);
      }
    },
    {
      timezone: "Asia/Kolkata"
    }
  );

  console.log("⏱️ [Annual Reset Cron]: Registered schedule '1 0 1 1 *' (Jan 1 00:00:01 IST).");
};

module.exports = initAnnualResetCron;
