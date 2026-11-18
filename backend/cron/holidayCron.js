const cron = require("node-cron");
const User = require("../models/User");
const { sendNationalHolidayEmail } = require("../services/emailService");
const { FIXED_NATIONAL_HOLIDAYS } = require("../utils/dateUtils");

// Runs daily at 09:00 AM IST (Asia/Kolkata)
const initHolidayCron = () => {
  cron.schedule(
    "0 9 * * *",
    async () => {
      try {
        console.log("⏰ Running Daily National Holiday Check (IST)...");

        // Determine tomorrow strictly in Indian Standard Time (Asia/Kolkata)
        const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const tomorrowIST = new Date(nowIST);
        tomorrowIST.setDate(tomorrowIST.getDate() + 1);

        const tMonth = tomorrowIST.getMonth();
        const tDate = tomorrowIST.getDate();

        // Check if tomorrow matches any fixed holiday
        const matchedHoliday = FIXED_NATIONAL_HOLIDAYS.find(
          (h) => h.month === tMonth && h.date === tDate
        );

        if (matchedHoliday) {
          console.log(`🎉 Found upcoming holiday: ${matchedHoliday.name}. Preparing email dispatch...`);

          const users = await User.find({ isDeleted: { $ne: true } }).select("email");
          const allEmails = users.map((u) => u.email).filter(Boolean);

          if (allEmails.length > 0) {
            const dateStr = tomorrowIST.toLocaleDateString("en-GB", {
              timeZone: "Asia/Kolkata",
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric"
            });

            await sendNationalHolidayEmail(matchedHoliday.name, dateStr, allEmails);
          }
        }
      } catch (cronErr) {
        console.error("🚨 [Holiday Cron Error]: Unhandled exception in daily holiday cron job:", cronErr);
      }
    },
    {
      timezone: "Asia/Kolkata"
    }
  );
};

module.exports = initHolidayCron;