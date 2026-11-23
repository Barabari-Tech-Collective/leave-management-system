/**
 * Shared system-wide constants for the leave management system.
 * Update values here when business rules change — never hard-code them inline.
 */

/** The first calendar year this leave portal was operational. */
const MIN_SYSTEM_YEAR = 2026;

/** Total annual paid leave quota (casual + sick + flexible). */
const TOTAL_PAID_LEAVES = 26;

/** Default leave allocations per category for a fresh year. */
const DEFAULT_LEAVE_ALLOCATIONS = {
  casual: 11,
  sick: 10,
  flexible: 5,
  national: 4
};

module.exports = {
  MIN_SYSTEM_YEAR,
  TOTAL_PAID_LEAVES,
  DEFAULT_LEAVE_ALLOCATIONS
};
