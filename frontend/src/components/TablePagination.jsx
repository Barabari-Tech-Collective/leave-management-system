import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function TablePagination({
  pagination = {
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  },
  onPageChange,
  onPageSizeChange,
  loading = false,
  pageSizeOptions = [10, 25, 50, 100],
  itemLabel = "requests",
  className = ""
}) {
  const { page = 1, limit = 25, total = 0, totalPages = 1, hasNextPage = false, hasPrevPage = false } = pagination;

  // Don't render pagination bar if there are no records
  if (total === 0) return null;

  const startRecord = (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pt-4 border-t border-gray-100 text-xs text-gray-500 ${className}`}
    >
      {/* Left Side: Rows per page selector & record range info */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-600">Rows per page:</span>
            <select
              value={limit}
              disabled={loading}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="px-2 py-1 sm:px-2.5 sm:py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {pageSizeOptions.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>
          </div>
        )}

        {onPageSizeChange && <span className="text-gray-300">|</span>}

        <span className="text-center sm:text-left">
          Showing <span className="font-bold text-gray-800">{startRecord}</span> to{" "}
          <span className="font-bold text-gray-800">{endRecord}</span> of{" "}
          <span className="font-bold text-gray-800">{total}</span> {itemLabel}
        </span>
      </div>

      {/* Right Side: Navigation buttons & Page numbers */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage || loading}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          title="Previous page"
        >
          <ChevronLeft size={15} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page Number Buttons with Ellipsis */}
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .map((p, index, array) => {
              const showEllipsis = index > 0 && p - array[index - 1] > 1;
              return (
                <React.Fragment key={p}>
                  {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                  <button
                    type="button"
                    onClick={() => onPageChange(p)}
                    disabled={loading || page === p}
                    className={`w-7 h-7 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                      page === p
                        ? "bg-indigo-600 text-white shadow-xs cursor-default"
                        : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              );
            })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage || loading}
          className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
          title="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
