// Normalize a date string (YYYY-MM-DD) or Date object to midnight UTC
const parseDateUTC = (dateInput) => {
  if (!dateInput) return null;
  if (typeof dateInput === "string") {
    const cleanDateStr = dateInput.split("T")[0];
    const d = new Date(`${cleanDateStr}T00:00:00.000Z`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
};

// Fixed National Holidays (0-indexed months: Jan=0, May=4, Aug=7, Oct=9)
const FIXED_NATIONAL_HOLIDAYS = [
  { name: "Republic Day", month: 0, date: 26 },
  { name: "Labour Day", month: 4, date: 1 },
  { name: "Independence Day", month: 7, date: 15 },
  { name: "Gandhi Jayanti", month: 9, date: 2 }
];

// Check if a given Date object (in UTC) falls on a fixed National Holiday
const isNationalHolidayUTC = (dateInput) => {
  if (!dateInput) return false;
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) return false;
  const month = d.getUTCMonth();
  const date = d.getUTCDate();
  return FIXED_NATIONAL_HOLIDAYS.some((h) => h.month === month && h.date === date);
};

// Calculate working days between fromDate and toDate (excluding Sundays and National Holidays as per policy)
const calculateWorkingDays = (fromDate, toDate, excludeSundays = true, excludeHolidays = true) => {
  const start = parseDateUTC(fromDate);
  const end = parseDateUTC(toDate);
  if (!start || !end || end < start) return 0;

  let days = 0;
  let current = new Date(start);
  while (current <= end) {
    const isSunday = current.getUTCDay() === 0;
    const isHoliday = isNationalHolidayUTC(current);
    if ((!excludeSundays || !isSunday) && (!excludeHolidays || !isHoliday)) {
      days++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
};

// Check if a date string or Date object is strictly before today in Indian Standard Time (yesterday or earlier)
const isPastDate = (dateInput) => {
  if (!dateInput) return false;

  let targetDateStr;
  if (typeof dateInput === "string") {
    targetDateStr = dateInput.split("T")[0];
  } else if (dateInput instanceof Date && !isNaN(dateInput.getTime())) {
    targetDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(dateInput);
  } else {
    return false;
  }

  const todayISTStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  // Lexicographical comparison of YYYY-MM-DD strings is deterministic and timezone-proof
  return targetDateStr < todayISTStr;
};

// Format a date string or Date object in Indian Standard Time (DD/MM/YYYY)
const formatDateIST = (dateInput) => {
  if (!dateInput) return "N/A";
  return new Date(dateInput).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
};

module.exports = {
  FIXED_NATIONAL_HOLIDAYS,
  isNationalHolidayUTC,
  parseDateUTC,
  calculateWorkingDays,
  isPastDate,
  formatDateIST
};
