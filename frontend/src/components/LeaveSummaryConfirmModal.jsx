import React from "react";
import { createPortal } from "react-dom";
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  ArrowRight, 
  FileText, 
  Sparkles, 
  X,
  Loader2,
  RotateCcw,
  Ban,
  Info
} from "lucide-react";

export default function LeaveSummaryConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isSubmitting = false,
  leaveData,
  balanceData,
  mode = "apply" // "apply" | "cancel"
}) {
  if (!isOpen || !leaveData) return null;

  const isCancel = mode === "cancel";
  const { type, from, to, days, reason, isPastLeave } = leaveData;
  const { pending = 0, effectiveAvailable = 0, totalPendingPaid = 0 } = balanceData || {};
  const balanceAfter = Math.max(0, effectiveAvailable - days);

  // Normalize date display to DD/MM/YYYY regardless of incoming format
  const formatDisplayDate = (d) => {
    if (!d) return "-";
    if (typeof d === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      return d;
    }
    if (typeof d === "string" && d.includes("-")) {
      const parts = d.split("-").map(Number);
      if (parts.length === 3 && parts[0] > 1000) {
        const [y, m, day] = parts;
        const dateObj = new Date(Date.UTC(y, m - 1, day));
        return dateObj.toLocaleDateString("en-GB", { timeZone: "UTC" });
      }
    }
    const dateObj = new Date(d);
    return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" });
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="relative bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div 
          className={`h-2 w-full ${
            isCancel
              ? "bg-linear-to-r from-rose-500 via-amber-500 to-rose-600"
              : isPastLeave 
              ? "bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-700" 
              : "bg-linear-to-r from-primary via-indigo-400 to-indigo-600"
          }`} 
        />

        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              {isCancel ? (
                <>
                  <AlertTriangle size={20} className="text-rose-600 shrink-0" />
                  <span>Cancel Pending Leave</span>
                </>
              ) : isPastLeave ? (
                <>
                  <Sparkles size={20} className="text-purple-600 shrink-0" />
                  <span>Confirm Past Leave</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="text-primary shrink-0" />
                  <span>Review Leave Application</span>
                </>
              )}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isCancel
                ? "Are you sure you want to withdraw this pending application?"
                : "Please double-check the summary before confirming submission."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Mode & Category Banner */}
          <div className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
            <div>
              <p className="text-[10px] sm:text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Leave Category</p>
              <h4 className="text-base sm:text-lg font-extrabold text-indigo-950 capitalize mt-0.5">
                {type && type.includes("Extra") ? "Extra Leave" : `${type} Leave`}
              </h4>
            </div>
            <div>
              {type && type.includes("Extra") ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                  <AlertTriangle size={13} className="text-amber-700" />
                  Extra Leave
                </span>
              ) : isCancel ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                  <Clock size={13} />
                  Pending
                </span>
              ) : isPastLeave ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 shadow-2xs">
                  <Clock size={13} />
                  Past Leave
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200 shadow-2xs">
                  <Calendar size={13} />
                  Future Request
                </span>
              )}
            </div>
          </div>

          {/* Dates & Duration Card */}
          <div className="p-3.5 sm:p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2.5 sm:space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 bg-white rounded-xl border border-slate-200 shadow-2xs ${isCancel ? "text-rose-600" : "text-primary"}`}>
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Selected Period</p>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 mt-0.5">
                    {formatDisplayDate(from)} <span className="text-slate-400 font-normal">to</span> {formatDisplayDate(to)}
                  </p>
                </div>
              </div>

              <div className="sm:text-right pl-9 sm:pl-0">
                <span className={`text-xl sm:text-2xl font-extrabold ${isCancel ? "text-rose-600" : "text-primary"}`}>{days}</span>
                <span className="text-xs font-bold text-slate-600 ml-1">{days === 1 ? "Working Day" : "Working Days"}</span>
                <p className="text-[10px] text-slate-400 font-medium">(Sundays excluded)</p>
              </div>
            </div>
          </div>

          {/* Balance Impact / Release Card */}
          {type && type.includes("Extra") ? (
            <div className="p-3.5 sm:p-4 bg-amber-50 rounded-2xl border border-amber-300 space-y-2 text-xs text-amber-900">
              <p className="font-bold flex items-center gap-1.5 text-sm text-amber-950">
                <AlertTriangle size={16} className="text-amber-600" />
                <span>Extra Leave Notice</span>
              </p>
              <p className="leading-relaxed">
                This leave is taken beyond your 26 paid leaves. An automated notification email will be dispatched to your <strong>Vertical Lead</strong>, <strong>Vertical Teammates</strong>, <strong>Admins</strong>, and the <strong>Finance Team</strong> for payroll adjustments.
              </p>
              {totalPendingPaid > 0 && (
                <div className="p-2.5 bg-blue-50/90 rounded-xl border border-blue-200 text-blue-900 space-y-1">
                  <p className="font-bold text-xs text-blue-950 flex items-center gap-1">
                    <Info size={13} className="text-blue-600" />
                    <span>Pending Paid Leaves Available</span>
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    You currently have <strong>{totalPendingPaid} paid {totalPendingPaid === 1 ? "leave" : "leaves"} pending approval</strong>. You can cancel them from your History to reuse your paid quota instead of applying for Extra Leave.
                  </p>
                </div>
              )}
            </div>
          ) : isCancel ? (
            <div className="p-3.5 sm:p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <RotateCcw size={15} className="text-emerald-600" />
                <span>Balance Restoration Projection</span>
              </p>

              <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Days to be released:</span>
                  <span className="text-sm font-black text-emerald-600">+{days} {days === 1 ? "Day" : "Days"}</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed pt-1">
                  Cancelling this request will immediately free up these <strong>{days} day(s)</strong> held in pending status, returning them to your available <strong>{type}</strong> balance.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 sm:p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 space-y-2.5 sm:space-y-3">
              <p className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>Leave Balance Projection ({type})</span>
              </p>

              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">Available Now</p>
                  <p className="text-xs sm:text-base font-extrabold text-slate-800 mt-0.5">{effectiveAvailable} days</p>
                </div>

                <div className="p-2 sm:p-2.5 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase">This Request</p>
                  <p className="text-xs sm:text-base font-extrabold text-primary mt-0.5">-{days} {days === 1 ? "day" : "days"}</p>
                </div>

                <div className="p-2 sm:p-2.5 bg-emerald-100/60 rounded-xl border border-emerald-200 shadow-2xs">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase">Balance After</p>
                  <p className="text-xs sm:text-base font-extrabold text-emerald-700 mt-0.5">{balanceAfter} {balanceAfter === 1 ? "day" : "days"}</p>
                </div>
              </div>

              {pending > 0 && (
                <p className="text-[11px] text-slate-500 font-medium px-1 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Note: You currently have <strong>{pending} day(s)</strong> tied up in pending approval.
                </p>
              )}
            </div>
          )}

          {/* Reason Box */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <FileText size={14} className="text-indigo-600" />
              <span>{isCancel ? "Reason Entered For Leave" : "Reason Provided"}</span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl max-h-32 overflow-y-auto">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                {reason || <span className="italic text-slate-400">No reason provided.</span>}
              </p>
            </div>
          </div>

          {/* Next Steps / Process Info Box */}
          <div className={`p-3.5 rounded-2xl border text-xs font-medium leading-relaxed ${
            isCancel
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : isPastLeave 
              ? "bg-purple-50 border-purple-200 text-purple-900" 
              : "bg-blue-50 border-blue-200 text-blue-900"
          }`}>
            {isCancel ? (
              <p>
                ⚠️ <strong>Cancellation Impact:</strong> Once cancelled, this leave request will be withdrawn from your <strong>Vertical Lead's</strong> approval queue and marked as <strong>Cancelled</strong>. An automated notification email will be dispatched to your team and lead.
              </p>
            ) : isPastLeave ? (
              <p>
                ⚡ <strong>Past Leave Notice:</strong> Clicking Confirm will <strong>immediately record {days} {days === 1 ? "day" : "days"}</strong> for attendance. Your Vertical Lead, teammates, and Admins will be notified (no approval required).
              </p>
            ) : (
              <p>
                📢 <strong>Workflow Notice:</strong> An approval request will be dispatched to your <strong>Vertical Lead</strong> and teammates. Your request will be reviewed by your lead and admin.
              </p>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer disabled:opacity-50 text-center"
          >
            {isCancel ? "Keep Leave (Back)" : "Back & Edit"}
          </button>

          {isCancel ? (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md shadow-rose-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Ban size={15} />
                  <span>Confirm Cancellation</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onConfirm}
              className={`w-full sm:w-auto px-6 py-2.5 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md disabled:opacity-50 flex items-center justify-center gap-2 ${
                type && type.includes("Extra")
                  ? "bg-linear-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 shadow-amber-200"
                  : isPastLeave
                  ? "bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-200"
                  : "bg-linear-to-r from-primary to-indigo-600 hover:from-primary/95 hover:to-indigo-700 shadow-primary/20"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>
                    {type && type.includes("Extra")
                      ? "Confirm & Submit Extra Leave"
                      : isPastLeave
                      ? "Confirm & Record Past Leave"
                      : "Confirm & Submit Request"}
                  </span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
