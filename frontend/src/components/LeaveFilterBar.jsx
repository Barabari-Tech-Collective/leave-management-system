import React from "react";
import { RotateCcw } from "lucide-react";
import { MONTHS, LEAVE_STATUS_OPTIONS } from "../constants/leaveConstants";

const noop = () => {};

export default function LeaveFilterBar({
  yearFilter = "all",
  onYearChange = noop,
  availableYears = [new Date().getFullYear()],
  monthFilter = "all",
  onMonthChange = noop,
  statusFilter = "all",
  onStatusChange = noop,
  onReset = noop,
  hasActiveFilters = false,
  className = ""
}) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* Year Filter */}
      <div className="flex items-center">
        <select
          value={yearFilter}
          onChange={(e) => onYearChange(e.target.value)}
          aria-label="Filter by Year"
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 transition"
        >
          <option value="all">All Years</option>
          {(availableYears && availableYears.length > 0 ? availableYears : [new Date().getFullYear()]).map((yr) => (
            <option key={yr} value={yr.toString()}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Month Filter */}
      <div className="flex items-center">
        <select
          value={monthFilter}
          onChange={(e) => onMonthChange(e.target.value)}
          aria-label="Filter by Month"
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 transition"
        >
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center">
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by Status"
          className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-100 transition"
        >
          {LEAVE_STATUS_OPTIONS.map((st) => (
            <option key={st.value} value={st.value}>
              {st.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
          title="Clear all filters"
        >
          <RotateCcw size={12} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
}
