import React from "react";
import StatusBadge from "./StatusBadge";
import EmailRetryButton from "./EmailRetryButton";
import { Eye, CheckCircle2, AlertCircle, Loader2, Calendar } from "lucide-react";

export default function EmployeeLeaveTable({
  leaves = [],
  loading = false,
  loadingText = "Loading leave requests...",
  onViewLeave,
  showEmailStatus = true,
  retryingId = null,
  cooldowns = {},
  onResendEmail,
  emptyMessage = "No leave requests found.",
  emptyAction = null,
  footer = null,
}) {
  const columnCount = showEmailStatus ? 7 : 6;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-4 px-5 text-left">Month</th>
              <th className="py-4 px-5 text-left">Type</th>
              <th className="py-4 px-5 text-left">Dates</th>
              <th className="py-4 px-5 text-left">Days</th>
              <th className="py-4 px-5 text-left">Status</th>
              {showEmailStatus && (
                <th className="py-4 px-5 text-left">Email Notification</th>
              )}
              <th className="py-4 px-5 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="p-12 text-center text-slate-400 font-medium"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs">{loadingText}</span>
                  </div>
                </td>
              </tr>
            ) : leaves.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="p-8 text-center text-slate-400 font-medium"
                >
                  {emptyAction ? (
                    <div className="py-6 px-4 text-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-700 text-base mb-1">
                        {emptyMessage}
                      </h3>
                      {emptyAction}
                    </div>
                  ) : (
                    emptyMessage
                  )}
                </td>
              </tr>
            ) : (
              leaves.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50/80 transition-colors duration-200"
                >
                  <td className="py-4 px-5 font-medium text-slate-700 whitespace-nowrap">
                    {item.month || "—"}
                  </td>

                  <td className="py-4 px-5 text-slate-700 capitalize font-semibold whitespace-nowrap">
                    {item.type}
                  </td>

                  <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                    {item.from} <span className="text-slate-400 font-normal">to</span> {item.to}
                  </td>

                  <td className="py-4 px-5 font-bold text-slate-800 whitespace-nowrap">
                    {item.days} {item.days === 1 ? "day" : "days"}
                  </td>

                  <td className="py-4 px-5 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>

                  {showEmailStatus && (
                    <td className="py-4 px-5 whitespace-nowrap">
                      {item.emailStatus === "sent" ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title="Accepted by the email provider; recipient delivery is not independently confirmed."
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Sent
                        </span>
                      ) : item.emailStatus === "pending" ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                          Sending...
                        </span>
                      ) : item.emailStatus === "failed" ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                            title={item.emailError || "Email failed to dispatch"}
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            Failed
                          </span>
                          {onResendEmail && (
                            <EmailRetryButton
                              onRetry={() => onResendEmail(item._id)}
                              isRetrying={retryingId === item._id}
                              cooldownSeconds={cooldowns[item._id] || 0}
                              size="xs"
                            />
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  )}

                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => onViewLeave && onViewLeave(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer shadow-2xs"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {footer && (
        <div className="border-t border-slate-100 bg-slate-50/50">
          {footer}
        </div>
      )}
    </div>
  );
}
