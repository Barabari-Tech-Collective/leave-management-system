const cron = require("node-cron");
const User = require("../models/User");
const { sendNationalHolidayEmail } = require("../services/emailService");

// 4 Fixed National Holidays (0-indexed months in JavaScript: Jan=0, May=4, Aug=7, Oct=9)
const FIXED_NATIONAL_HOLIDAYS = [
  { name: "Republic Day", month: 0, date: 26 },
  { name: "Labour Day", month: 4, date: 1 },
  { name: "Independence Day", month: 7, date: 15 },
  { name: "Gandhi Jayanti", month: 9, date: 2 }
];

// Runs daily at 09:00 AM
const initHolidayCron = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ Running Daily National Holiday Check...");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tMonth = tomorrow.getMonth();
    const tDate = tomorrow.getDate();

    // Check if tomorrow matches any fixed holiday
    const matchedHoliday = FIXED_NATIONAL_HOLIDAYS.find(
      (h) => h.month === tMonth && h.date === tDate
    );

    if (matchedHoliday) {
      console.log(`🎉 Found upcoming holiday: ${matchedHoliday.name}. Preparing email dispatch...`);

      const users = await User.find().select("email");
      const allEmails = users.map((u) => u.email).filter(Boolean);

      if (allEmails.length > 0) {
        const dateStr = tomorrow.toLocaleDateString("en-GB", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric"
        });

        await sendNationalHolidayEmail(matchedHoliday.name, dateStr, allEmails);
      }
    }
  });
};

module.exports = initHolidayCron;