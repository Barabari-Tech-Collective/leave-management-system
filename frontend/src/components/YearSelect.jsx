import React from "react";
import { Calendar } from "lucide-react";

export const MIN_SYSTEM_YEAR = 2026;

const noop = () => {};

export default function YearSelect({
  value,
  onChange = noop,
  availableYears = [],
  minYear = MIN_SYSTEM_YEAR,
  allowAllYears = false,
  label = "Year:",
  showIcon = true,
  variant = "card", // "card" | "pill"
  disabled = false,
  id = "year-select-dropdown",
  className = ""
}) {
  const currentYear = new Date().getFullYear();
  const selectedValue =
    value !== undefined && value !== null
      ? value.toString()
      : currentYear.toString();

  // Generate range from minYear (2026) up to upcoming advance year (currentYear + 1)
  const yearsSet = new Set();
  const maxYear = currentYear + 1;
  for (let y = minYear; y <= maxYear; y++) {
    yearsSet.add(y);
  }

  // Include any additional years passed from the backend / database
  if (Array.isArray(availableYears)) {
    availableYears.forEach((yr) => {
      const num = parseInt(yr, 10);
      if (!isNaN(num)) yearsSet.add(num);
    });
  }

  // Sort descending: e.g., in 2030 -> [2031, 2030, 2029, ..., 2026]
  const sortedYears = Array.from(yearsSet).sort((a, b) => b - a);

  const isPill = variant === "pill";

  const containerClasses = isPill
    ? `flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl ${className}`
    : `flex items-center gap-2 ${className}`;

  const selectClasses = isPill
    ? "bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer disabled:opacity-50"
    : "px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs hover:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition disabled:opacity-50";

  const labelClasses = isPill
    ? "text-xs font-semibold text-slate-500"
    : "text-xs font-semibold text-slate-600 flex items-center gap-1.5";

  return (
    <div className={containerClasses}>
      {showIcon && (
        <Calendar size={isPill ? 13 : 14} className="text-indigo-600 shrink-0" />
      )}
      {label && (
        <label htmlFor={id} className={labelClasses}>
          {label}
        </label>
      )}
      <select
        id={id}
        value={selectedValue}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={label || "Select Year"}
        className={selectClasses}
      >
        {sortedYears.map((yr) => (
          <option key={yr} value={yr.toString()}>
            {yr === currentYear
              ? `${yr} (Current Year)`
              : yr === currentYear + 1
              ? `${yr} (Next Year)`
              : yr}
          </option>
        ))}
        {allowAllYears && <option value="all">All Years</option>}
      </select>
    </div>
  );
}
