// src/constants/leaveConstants.js

export const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

export const LEAVE_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
];

export const VERTICALS = ["Program", "Placement", "EdTech", "Operations"];

export const getNationalHolidays = (year = new Date().getFullYear()) => {
  const y = parseInt(year, 10) || new Date().getFullYear();
  return [
    { name: "Republic Day", date: new Date(`${y}-01-26T00:00:00`) },
    { name: "Labour Day", date: new Date(`${y}-05-01T00:00:00`) },
    { name: "Independence Day", date: new Date(`${y}-08-15T00:00:00`) },
    { name: "Gandhi Jayanti", date: new Date(`${y}-10-02T00:00:00`) },
  ];
};

export const NATIONAL_HOLIDAYS_2026 = getNationalHolidays(2026);
