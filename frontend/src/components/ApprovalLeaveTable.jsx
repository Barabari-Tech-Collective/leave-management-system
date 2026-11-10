import React from "react";
import StatusBadge from "./StatusBadge";
import EmailRetryButton from "./EmailRetryButton";
import { Eye, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ApprovalLeaveTable({
  leaves = [],
  loading = false,
  showVertical = false,
  actionLabel = "View / Manage",
  memberColumnLabel = "Member",
  onViewLeave,
  onResendEmail,
  retryingId = null,
  cooldowns = {},
  emptyMessage = "No leave applications found.",
  onResetFilters = null,
  className = ""
}) {
  if (loading) {
    return (
      <div className={`p-16 flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`}>
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-xs font-medium">Loading requests...</p>
      </div>
    );
  }

  if (leaves.length === 0) {
    return (
      <div className={`p-12 text-center text-slate-400 space-y-2 ${className}`}>
        <p className="text-sm font-medium">{emptyMessage}</p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs text-primary font-bold hover:underline cursor-pointer"
          >
            Reset filters to view all
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-left text-xs sm:text-sm border-collapse table-auto">
        <thead>
          <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] sm:text-[11px] font-bold border-b border-slate-100 tracking-wider">
            <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 whitespace-nowrap">{memberColumnLabel}</th>
            {showVertical && <th className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">Vertical</th>}
            <th className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">Type</th>
            <th className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">Dates</th>
            <th className="py-2.5 px-2 sm:py-3 sm:px-2 whitespace-nowrap text-center sm:text-left">Days</th>
            <th className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">Status</th>
            <th className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">Notification</th>
            <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leaves.map((leave) => {
            const isEmailNotApplicable =
              leave.status === "pending" ||
              leave.status === "cancelled" ||
              leave.isPastLeave ||
              !leave.decisionEmailStatus ||
              leave.decisionEmailStatus === "none";

            return (
              <tr key={leave._id} className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-3 sm:py-3 sm:px-3.5 font-semibold text-slate-900">
                  <div className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[180px]" title={leave.user?.name}>
                    {leave.user?.name || "Unknown"}
                  </div>
                  <div className="text-[11px] text-slate-400 font-normal truncate max-w-[140px] sm:max-w-[180px]" title={leave.user?.email}>
                    {leave.user?.email}
                  </div>
                </td>
                {showVertical && (
                  <td className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700">
                      {leave.user?.vertical || leave.vertical}
                    </span>
                  </td>
                )}
                <td className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <span className="capitalize font-semibold text-slate-700 text-xs">
                      {leave.type === "extra" ? "Extra" : leave.type}
                    </span>
                    {leave.isPastLeave && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Past
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-2 sm:py-3 sm:px-2.5 text-slate-600 text-xs whitespace-nowrap">
                  {new Date(leave.fromDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })} -{" "}
                  {new Date(leave.toDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="py-2.5 px-2 sm:py-3 sm:px-2 font-bold text-slate-800 text-xs whitespace-nowrap text-center sm:text-left">
                  {leave.days}d
                </td>
                <td className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">
                  <StatusBadge status={leave.status} />
                </td>
                <td className="py-2.5 px-2 sm:py-3 sm:px-2.5 whitespace-nowrap">
                  {isEmailNotApplicable ? (
                    <span className="text-gray-400 font-bold text-xs px-2">-</span>
                  ) : leave.decisionEmailStatus === "failed" ? (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title={leave.decisionEmailError || "Status email delivery failed"}
                      >
                        <AlertCircle size={11} className="text-rose-600" />
                        Failed
                      </span>
                      {onResendEmail && (
                        <EmailRetryButton
                          onRetry={() => onResendEmail(leave._id)}
                          isRetrying={retryingId === leave._id}
                          cooldownSeconds={cooldowns[leave._id] || 0}
                          size="xs"
                        />
                      )}
                    </div>
                  ) : leave.decisionEmailStatus === "sent" ? (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                      title="Notification email sent to employee"
                    >
                      <CheckCircle2 size={11} className="text-emerald-600" />
                      Sent
                    </span>
                  ) : (
                    <span className="text-gray-400 font-bold text-xs px-2">-</span>
                  )}
                </td>
                <td className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onViewLeave && onViewLeave(leave)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer shadow-2xs"
                    title={actionLabel === "View" ? "View leave request details" : "View full details and manage approval status"}
                  >
                    <Eye size={13} />
                    <span>{actionLabel}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
