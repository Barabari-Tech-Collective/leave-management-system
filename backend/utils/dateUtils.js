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

// Calculate working days between fromDate and toDate (optionally skipping Sundays)
const calculateWorkingDays = (fromDate, toDate, excludeSundays = true) => {
  const start = parseDateUTC(fromDate);
  const end = parseDateUTC(toDate);
  if (!start || !end || end < start) return 0;

  let days = 0;
  let current = new Date(start);
  while (current <= end) {
    if (!excludeSundays || current.getUTCDay() !== 0) {
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
  parseDateUTC,
  calculateWorkingDays,
  isPastDate,
  formatDateIST
};
