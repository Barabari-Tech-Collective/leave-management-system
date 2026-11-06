import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import EmailRetryButton from "./EmailRetryButton";
import { 
  X, 
  Calendar, 
  Clock, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  AlertTriangle,
  Loader2
} from "lucide-react";

export default function EmployeeLeaveViewModal({ 
  isOpen, 
  onClose, 
  leave, 
  onResend, 
  isRetrying, 
  cooldownSeconds 
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

  const getStatusBadge = (status) => {
    const norm = String(status || "pending").trim().toLowerCase();
    switch (norm) {
      case "approved":
      case "success":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
            <CheckCircle2 size={13} className="text-green-700" /> {norm === "success" ? "Success" : "Approved"}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle size={13} className="text-red-700" /> Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock size={13} className="text-yellow-700" /> Pending Approval
          </span>
        );
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Leave Request Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Overview of your submitted application</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div>
              <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Leave Category</p>
              <h4 className="text-base font-extrabold text-indigo-950 capitalize mt-0.5">
                {leave.type} Leave
              </h4>
            </div>
            <div className="text-right">
              {getStatusBadge(leave.status)}
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
                {leave.from} <span className="text-slate-400 font-normal">to</span> {leave.to}
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
          <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {leave.emailStatus === "sent" ? (
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <CheckCircle2 size={16} />
                </div>
              ) : leave.emailStatus === "pending" ? (
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
                  {leave.emailStatus === "sent" && "Delivered to manager notification queue"}
                  {leave.emailStatus === "pending" && "Sending email in background..."}
                  {leave.emailStatus === "failed" && (leave.emailError || "Delivery failed")}
                </p>
              </div>
            </div>

            {/* If email failed, provide retry right in the modal as well */}
            {leave.emailStatus === "failed" && onResend && (
              <EmailRetryButton
                onRetry={() => onResend(leave._id)}
                isRetrying={isRetrying}
                cooldownSeconds={cooldownSeconds}
                size="sm"
                label="Retry Email"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
