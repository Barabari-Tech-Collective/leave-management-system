import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import EmailRetryButton from "./EmailRetryButton";
import StatusBadge from "./StatusBadge";
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  AlertTriangle,
  Loader2,
  Ban
} from "lucide-react";

export default function EmployeeLeaveViewModal({ 
  isOpen, 
  onClose, 
  leave, 
  onResend, 
  isRetrying, 
  cooldownSeconds,
  onCancelLeave,
  isCancelling,
  onResendCancellation,
  isRetryingCancellation = false,
  cancellationCooldownSeconds = 0
}) {
  // Lock body scroll when modal is open to prevent page movement
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen || !leave) return null;

  const formatDisplayDate = (d) => {
    if (!d) return "-";
    if (typeof d === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(d)) return d;
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">
              {leave.isPastLeave ? "Past Leave Record" : "Leave Request Details"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {leave.isPastLeave
                ? "Overview of your recorded past leave"
                : "Overview of your submitted application"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {leave.isPastLeave && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl flex items-center gap-2 text-xs text-indigo-800 font-medium">
              <Clock size={16} className="text-indigo-600 shrink-0" />
              <span>
                <strong>Past Leave Record:</strong> This leave was taken in the past and was automatically approved.
              </span>
            </div>
          )}

          {leave.status === "cancelled" && (
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-2xl flex items-center gap-2 text-xs text-slate-700 font-medium">
              <Ban size={16} className="text-slate-500 shrink-0" />
              <span>
                <strong>Leave Cancelled:</strong> This request was cancelled by you. No approval action is required.
              </span>
            </div>
          )}

          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div>
              <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Leave Category</p>
              <div className="flex items-center gap-2 mt-0.5">
                <h4 className="text-base font-extrabold text-indigo-950 capitalize">
                  {leave.type} Leave
                </h4>
                {leave.isPastLeave && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Past Leave
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <StatusBadge status={leave.status} />
              <p className="text-xs font-bold text-slate-600 mt-1">
                {leave.days} {leave.days === 1 ? "Day" : "Days"} total
              </p>
            </div>
          </div>

          {/* Requested Dates */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="p-2.5 bg-white text-indigo-600 rounded-xl border border-slate-200 shadow-2xs">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requested Period</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatDisplayDate(leave.from || leave.fromDate)} <span className="text-slate-400 font-normal">to</span> {formatDisplayDate(leave.to || leave.toDate)}
              </p>
            </div>
          </div>

          {/* Full Reason Box (No truncation, comfortable reading) */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <FileText size={14} className="text-indigo-600" />
              <span>Reason for Leave</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-52 overflow-y-auto">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                {leave.reason ? leave.reason : <span className="italic text-slate-400">No reason provided.</span>}
              </p>
            </div>
          </div>

          {/* Rejection Note (If leave was rejected) */}
          {leave.status === "rejected" && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider">
                <AlertTriangle size={14} />
                <span>Manager's Rejection Note</span>
              </div>
              <p className="text-sm text-rose-800 leading-relaxed whitespace-pre-wrap break-words">
                {leave.rejectionReason || "No specific reason was provided by the reviewer."}
              </p>
            </div>
          )}

          {/* Email Notification Status & In-Modal Retry */}
          {(() => {
            const emailStatus = leave.emailStatus || "sent";
            const isFailed = emailStatus === "failed";
            const isPending = emailStatus === "pending";
            const isSent = emailStatus === "sent";

            return (
              <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {isSent ? (
                    <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                      <CheckCircle2 size={16} />
                    </div>
                  ) : isPending ? (
                    <div className="p-2 bg-amber-100 text-amber-700 rounded-xl animate-pulse">
                      <Loader2 size={16} className="animate-spin" />
                    </div>
                  ) : (
                    <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                      <AlertCircle size={16} />
                    </div>
                  )}

                  <div>
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Manager Email Dispatch
                    </p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                      {isSent && "Delivered to manager notification queue"}
                      {isPending && "Sending email in background..."}
                      {isFailed && (leave.emailError || "Delivery failed")}
                    </p>
                  </div>
                </div>

                {/* If email failed, provide retry right in the modal as well */}
                {isFailed && onResend && (
                  <EmailRetryButton
                    onRetry={() => onResend(leave._id)}
                    isRetrying={isRetrying}
                    cooldownSeconds={cooldownSeconds}
                    size="sm"
                    label="Retry Email"
                  />
                )}
              </div>
            );
          })()}

          {/* Cancellation Notification Email Dispatch (When Leave is Cancelled) */}
          {leave.status === "cancelled" && leave.cancellationEmailStatus && leave.cancellationEmailStatus !== "none" && (
            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {leave.cancellationEmailStatus === "sent" ? (
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <CheckCircle2 size={16} />
                  </div>
                ) : leave.cancellationEmailStatus === "pending" ? (
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl animate-pulse">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : (
                  <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                    <AlertCircle size={16} />
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Cancellation Notification Email
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {leave.cancellationEmailStatus === "sent" && "Delivered to manager & teammates"}
                    {leave.cancellationEmailStatus === "pending" && "Sending cancellation email in background..."}
                    {leave.cancellationEmailStatus === "failed" && (leave.cancellationEmailError || "Cancellation email delivery failed")}
                  </p>
                </div>
              </div>

              {leave.cancellationEmailStatus === "failed" && onResendCancellation && (
                <EmailRetryButton
                  onRetry={() => onResendCancellation(leave._id)}
                  isRetrying={isRetryingCancellation}
                  cooldownSeconds={cancellationCooldownSeconds}
                  size="sm"
                  label="Retry Email"
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
          <div>
            {onCancelLeave && leave.status === "pending" && (
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => onCancelLeave(leave)}
                className="px-3.5 sm:px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
              >
                {isCancelling ? <Loader2 size={13} className="animate-spin text-rose-600" /> : <X size={14} />}
                <span>Cancel Request</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 sm:px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
