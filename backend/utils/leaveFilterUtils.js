const Leave = require("../models/Leave");

/**
 * Builds a MongoDB filter object for querying leave records based on year, month, status, and a baseFilter.
 * Handles single-month, single-year, and month-only filters across calendar years (including cross-year spans).
 *
 * @param {Object} params
 * @param {string|number} [params.year] - Target year (e.g. 2025) or "all"
 * @param {string|number} [params.month] - 0-indexed month (0-11) or "all"
 * @param {string} [params.status] - Leave status ("pending", "approved", "rejected", "cancelled") or "all"
 * @param {Object} [params.baseFilter={}] - Base MongoDB filter (e.g., user constraint, vertical constraint)
 * @returns {Object} MongoDB query filter
 */
const buildLeaveDateFilter = ({ year, month, status, baseFilter = {} } = {}) => {
  const filter = { ...baseFilter };

  if (status && status !== "all") {
    filter.status = String(status).toLowerCase();
  }

  const y = parseInt(year, 10);
  const isYearValid = !isNaN(y) && year !== "all";

  const m = parseInt(month, 10);
  const isMonthValid = !isNaN(m) && month !== "all" && m >= 0 && m <= 11;

  if (isYearValid) {
    if (isMonthValid) {
      // Month boundaries in UTC: 1st day 00:00:00 to last day 23:59:59.999
      const start = new Date(Date.UTC(y, m, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
      // Overlap condition: leave begins on or before end AND ends on or after start
      filter.fromDate = { $lte: end };
      filter.toDate = { $gte: start };
    } else {
      // Full year boundaries in UTC: Jan 1 00:00:00 to Dec 31 23:59:59.999
      const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      filter.fromDate = { $lte: end };
      filter.toDate = { $gte: start };
    }
  } else if (isMonthValid) {
    const targetMonth = m + 1; // MongoDB $month operator returns 1-indexed (1..12)

    // Match leaves that overlap targetMonth across any calendar year:
    // 1. Spans across >= 2 calendar years difference (covers all 12 months)
    // 2. Same calendar year: targetMonth falls between fromDate's month and toDate's month
    // 3. Cross-year span: targetMonth >= fromDate's month (start year) OR <= toDate's month (end year)
    filter.$expr = {
      $and: [
        { $eq: [{ $type: "$fromDate" }, "date"] },
        { $eq: [{ $type: "$toDate" }, "date"] },
        {
          $or: [
            { $gte: [{ $subtract: [{ $year: "$toDate" }, { $year: "$fromDate" }] }, 2] },
            {
              $and: [
                { $eq: [{ $year: "$fromDate" }, { $year: "$toDate" }] },
                { $lte: [{ $month: "$fromDate" }, targetMonth] },
                { $gte: [{ $month: "$toDate" }, targetMonth] }
              ]
            },
            {
              $and: [
                { $gt: [{ $year: "$toDate" }, { $year: "$fromDate" }] },
                {
                  $or: [
                    { $gte: [targetMonth, { $month: "$fromDate" }] },
                    { $lte: [targetMonth, { $month: "$toDate" }] }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
  }

  return filter;
};

/**
 * Aggregates available leave years from the database matching the baseFilter.
 * Always includes the current year and returns years in descending order.
 *
 * @param {Object} [baseFilter={}] - Base filter to scope the leaves (e.g., user ID, vertical)
 * @returns {Promise<number[]>} Array of unique years sorted descending
 */
const getAvailableLeaveYears = async (baseFilter = {}) => {
  const yearAgg = await Leave.aggregate([
    { $match: { ...baseFilter, fromDate: { $type: "date" } } },
    { $group: { _id: { $year: "$fromDate" } } }
  ]);

  const yearsSet = new Set();
  yearsSet.add(new Date().getFullYear());
  yearAgg.forEach((item) => {
    if (item._id && !isNaN(item._id)) yearsSet.add(item._id);
  });

  return Array.from(yearsSet).sort((a, b) => b - a);
};

module.exports = {
  buildLeaveDateFilter,
  getAvailableLeaveYears
};
