import React from "react";
import StatusBadge from "./StatusBadge";
import EmailRetryButton from "./EmailRetryButton";
import { Eye, CheckCircle2, AlertCircle, Loader2, Calendar, X } from "lucide-react";

export default function EmployeeLeaveTable({
  leaves = [],
  loading = false,
  loadingText = "Loading leave requests...",
  onViewLeave,
  onCancelLeave,
  cancellingId = null,
  showEmailStatus = true,
  retryingId = null,
  cooldowns = {},
  onResendEmail,
  onResendCancellation = null,
  retryingCancellationId = null,
  cancellationCooldowns = {},
  emptyMessage = "No leave requests found.",
  emptyAction = null,
  footer = null,
}) {
  const columnCount = showEmailStatus ? 7 : 6;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] sm:text-xs font-bold tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-left whitespace-nowrap">Month</th>
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-left whitespace-nowrap">Type</th>
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-left whitespace-nowrap">Dates</th>
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-left whitespace-nowrap">Days</th>
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-left whitespace-nowrap">Status</th>
              {showEmailStatus && (
                <th className="py-3 px-3 sm:py-4 sm:px-5 text-left whitespace-nowrap">Email Notification</th>
              )}
              <th className="py-3 px-3 sm:py-4 sm:px-5 text-right whitespace-nowrap">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="p-8 sm:p-12 text-center text-slate-400 font-medium"
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
                  className="p-6 sm:p-8 text-center text-slate-400 font-medium"
                >
                  {emptyAction ? (
                    <div className="py-4 sm:py-6 px-3 sm:px-4 text-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
                        <Calendar className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-slate-700 text-sm sm:text-base mb-1">
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
                  <td className="py-3.5 px-3 sm:py-4 sm:px-5 font-medium text-slate-700 whitespace-nowrap">
                    {item.month || "—"}
                  </td>

                  <td className="py-3.5 px-3 sm:py-4 sm:px-5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-700 capitalize font-semibold">
                        {item.type === "extra" ? "Extra Leave" : item.type}
                      </span>
                      {item.isPastLeave && (
                        <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          Past Leave
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-3 sm:py-4 sm:px-5 text-slate-600 whitespace-nowrap">
                    {item.from} <span className="text-slate-400 font-normal">to</span> {item.to}
                  </td>

                  <td className="py-3.5 px-3 sm:py-4 sm:px-5 font-bold text-slate-800 whitespace-nowrap">
                    {item.days} {item.days === 1 ? "day" : "days"}
                  </td>

                  <td className="py-3.5 px-3 sm:py-4 sm:px-5 whitespace-nowrap">
                    <StatusBadge status={item.status} />
                  </td>

                  {showEmailStatus && (() => {
                    const isCancelled = item.status === "cancelled";
                    const activeEmailStatus = isCancelled
                      ? (item.cancellationEmailStatus && item.cancellationEmailStatus !== "none" ? item.cancellationEmailStatus : "none")
                      : item.emailStatus;
                    const activeEmailError = isCancelled ? item.cancellationEmailError : item.emailError;
                    const isRetryingActiveEmail = isCancelled
                      ? retryingCancellationId === item._id
                      : retryingId === item._id;
                    const activeCooldown = isCancelled
                      ? (cancellationCooldowns[item._id] || 0)
                      : (cooldowns[item._id] || 0);
                    const handleActiveRetry = isCancelled
                      ? (onResendCancellation ? () => onResendCancellation(item._id) : null)
                      : (onResendEmail ? () => onResendEmail(item._id) : null);

                    return (
                      <td className="py-3.5 px-3 sm:py-4 sm:px-5 whitespace-nowrap">
                        {activeEmailStatus === "sent" ? (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title={
                              isCancelled
                                ? "Cancellation email delivered to manager and team notification queue."
                                : "Accepted by the email provider; recipient delivery is not independently confirmed."
                            }
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Sent
                          </span>
                        ) : activeEmailStatus === "pending" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                            Sending...
                          </span>
                        ) : activeEmailStatus === "failed" ? (
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              title={
                                activeEmailError ||
                                (isCancelled
                                  ? "Cancellation email failed to dispatch"
                                  : "Email failed to dispatch")
                              }
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              Failed
                            </span>
                            {handleActiveRetry && (
                              <EmailRetryButton
                                onRetry={handleActiveRetry}
                                isRetrying={isRetryingActiveEmail}
                                cooldownSeconds={activeCooldown}
                                size="xs"
                              />
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    );
                  })()}

                  <td className="py-3.5 px-3 sm:py-4 sm:px-5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      {onCancelLeave && item.status === "pending" && (
                        <button
                          type="button"
                          disabled={cancellingId === item._id}
                          onClick={() => onCancelLeave(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs transition border border-rose-200 cursor-pointer shadow-2xs disabled:opacity-50"
                          title="Cancel this pending leave request"
                        >
                          {cancellingId === item._id ? (
                            <Loader2 size={13} className="animate-spin text-rose-600" />
                          ) : (
                            <X size={13} />
                          )}
                          <span>Cancel</span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewLeave && onViewLeave(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer shadow-2xs"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                    </div>
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
