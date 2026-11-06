import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import EmailRetryButton from "./EmailRetryButton";
import { 
  X, 
  Check, 
  AlertTriangle, 
  AlertCircle,
  Calendar, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle,
  RotateCcw
} from "lucide-react";

export default function LeaveDetailsModal({ 
  isOpen, 
  onClose, 
  leave, 
  onStatusUpdated,
  onResendDecisionEmail,
  isRetryingDecisionEmail = false,
  decisionEmailCooldownSeconds = 0
}) {
  const [loading, setLoading] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showRevokeForm, setShowRevokeForm] = useState(false);
  const [showReapproveConfirm, setShowReapproveConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Lock body scroll when modal is open
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

  // Reset all sub-forms and state whenever modal is opened or target leave changes
  useEffect(() => {
    setShowRejectForm(false);
    setShowRevokeForm(false);
    setShowReapproveConfirm(false);
    setRejectionReason("");
    setLoading(false);
  }, [isOpen, leave?._id]);

  if (!isOpen || !leave) return null;

  const handleClose = () => {
    setShowRejectForm(false);
    setShowRevokeForm(false);
    setShowReapproveConfirm(false);
    setRejectionReason("");
    onClose();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  // 1. Approve / Re-approve Leave
  const handleApprove = async () => {
    try {
      setLoading(true);
      const res = await API.put(`/leave/update-status/${leave._id}`, { status: "approved" });
      if (res.data?.emailSent === false) {
        toast("Leave approved, but employee notification email failed to send.", { icon: "⚠️", duration: 5000 });
      } else {
        toast.success(
          leave.status === "rejected"
            ? "Leave request re-approved & employee notified! ✅"
            : "Leave request approved & employee notified! ✅"
        );
      }
      if (onStatusUpdated) onStatusUpdated();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve leave");
    } finally {
      setLoading(false);
    }
  };

  // 2. Reject Pending Leave OR Revoke Approved Leave
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }

    try {
      setLoading(true);
      const res = await API.put(`/leave/update-status/${leave._id}`, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      if (res.data?.emailSent === false) {
        toast("Leave status updated, but employee notification email failed to send.", { icon: "⚠️", duration: 5000 });
      } else {
        toast.success(
          leave.status === "approved"
            ? "Approved leave revoked & balance refunded to employee! ✅"
            : "Leave request rejected & notification email sent! ✅"
        );
      }
      if (onStatusUpdated) onStatusUpdated();
      handleClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update leave status");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const norm = String(status || "pending").trim().toLowerCase();
    switch (norm) {
      case "approved":
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 border border-green-300">
            <CheckCircle2 size={13} className="text-green-700" /> {norm === "success" ? "Success" : "Approved"}
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle size={13} className="text-red-700" /> Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">
            <Clock size={13} className="text-yellow-700" /> Pending Approval
          </span>
        );
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Leave Request Details</h3>
            <p className="text-xs text-slate-500 mt-0.5">Review and manage leave application status</p>
          </div>
          <button
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Employee Info Header Card */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                {leave.user?.name ? leave.user.name.charAt(0).toUpperCase() : <User size={18} />}
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-base">{leave.user?.name || "Unknown User"}</h4>
                <p className="text-xs text-slate-500">{leave.user?.email || "No email"}</p>
                {leave.vertical && (
                  <span className="inline-block mt-1 text-[11px] font-semibold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    {leave.vertical} Vertical
                  </span>
                )}
              </div>
            </div>
            <div>{getStatusBadge(leave.status)}</div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Leave Type</p>
              <p className="text-sm font-bold text-slate-800 capitalize mt-0.5">{leave.type || "-"}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Duration</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">
                {leave.days} {leave.days === 1 ? "Day" : "Days"}
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Applied On</p>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{formatDate(leave.createdAt)}</p>
            </div>
          </div>

          {/* Leave Dates Detail */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex items-center gap-3">
            <div className="p-2.5 bg-white text-indigo-600 rounded-xl border border-slate-200">
              <Calendar size={18} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Requested Period</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5">
                {formatDate(leave.fromDate)} <span className="text-slate-400 font-normal">to</span> {formatDate(leave.toDate)}
              </p>
            </div>
          </div>

          {/* Full Reason Box */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <FileText size={14} className="text-indigo-600" />
              <span>Reason for Leave</span>
            </div>
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-h-48 overflow-y-auto">
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
                {leave.reason ? leave.reason : <span className="italic text-slate-400">No reason provided.</span>}
              </p>
            </div>
          </div>

          {/* Rejection Note (displayed if status is rejected and reason exists) */}
          {leave.status === "rejected" && leave.rejectionReason && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 uppercase tracking-wider">
                <AlertTriangle size={14} />
                <span>Rejection Reason</span>
              </div>
              <p className="text-sm text-rose-800 leading-relaxed whitespace-pre-wrap break-words">
                {leave.rejectionReason}
              </p>
            </div>
          )}

          {/* 1. Pending Rejection Form (Guarded: only renders if status is strictly pending) */}
          {leave.status === "pending" && showRejectForm && (
            <form onSubmit={handleConfirmReject} className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                <AlertTriangle size={16} />
                <span>Specify Rejection Reason</span>
              </div>
              <textarea
                rows={3}
                required
                autoFocus
                placeholder="e.g. Critical deployment scheduled; team capacity requires full coverage."
                className="w-full p-3 bg-white border border-rose-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs text-slate-800 resize-none font-medium"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason("");
                  }}
                  className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          )}

          {/* 2. Revoke Approved Leave Form (Guarded: only renders if status is approved) */}
          {leave.status === "approved" && showRevokeForm && (
            <form onSubmit={handleConfirmReject} className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <RotateCcw size={16} />
                <span>Revoke / Cancel Approved Leave</span>
              </div>
              <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <p className="font-semibold text-amber-800">⚠️ Balance Refund Notice:</p>
                <p className="mt-0.5">
                  Revoking this leave will refund <strong>{leave.days} {leave.days === 1 ? "day" : "days"}</strong> back to the employee's balance and notify them via email.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Revoking Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  autoFocus
                  placeholder="e.g. Employee reported to work / emergency project coverage required."
                  className="w-full p-3 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-xs text-slate-800 resize-none font-medium"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setShowRevokeForm(false);
                    setRejectionReason("");
                  }}
                  className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Revoking..." : "Confirm Revoke & Refund Balance"}
                </button>
              </div>
            </form>
          )}

          {/* 3. Re-approve Rejected Leave Confirmation (Guarded: only renders if status is rejected) */}
          {leave.status === "rejected" && showReapproveConfirm && (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <CheckCircle2 size={16} />
                <span>Re-approve Leave Request</span>
              </div>
              <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                <p>
                  Re-approving this request will deduct <strong>{leave.days} {leave.days === 1 ? "day" : "days"}</strong> from the employee's leave balance and send them an approval email.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => setShowReapproveConfirm(false)}
                  className="px-3.5 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleApprove}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Re-approving..." : "Confirm Re-approval"}
                </button>
              </div>
            </div>
          )}

          {/* Employee Notification Delivery Card (when status is approved or rejected) */}
          {leave.status !== "pending" && (
            <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  leave.decisionEmailStatus === "failed" 
                    ? "bg-rose-100 text-rose-600" 
                    : "bg-emerald-100 text-emerald-600"
                }`}>
                  {leave.decisionEmailStatus === "failed" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Employee Email Notification
                  </p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">
                    {leave.decisionEmailStatus === "failed"
                      ? (leave.decisionEmailError || "Delivery to employee email failed")
                      : "Notification email sent to employee"}
                  </p>
                </div>
              </div>

              {leave.decisionEmailStatus === "failed" && onResendDecisionEmail && (
                <EmailRetryButton
                  onRetry={() => onResendDecisionEmail(leave._id)}
                  isRetrying={isRetryingDecisionEmail}
                  cooldownSeconds={decisionEmailCooldownSeconds}
                  size="sm"
                  label="Retry Email"
                />
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
          >
            Close
          </button>

          {/* Contextual Actions based on leave status */}
          <div className="flex items-center gap-2">
            {/* Pending actions */}
            {leave.status === "pending" && !showRejectForm && (
              <>
                <button
                  disabled={loading}
                  onClick={() => setShowRejectForm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <X size={15} />
                  <span>Reject</span>
                </button>
                <button
                  disabled={loading}
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Check size={15} />
                  <span>{loading ? "Approving..." : "Approve"}</span>
                </button>
              </>
            )}

            {/* Approved leave action: Revoke / Cancel */}
            {leave.status === "approved" && !showRevokeForm && (
              <button
                disabled={loading}
                onClick={() => {
                  setShowRevokeForm(true);
                  setRejectionReason("");
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Revoke this leave and refund balance to the employee"
              >
                <RotateCcw size={14} />
                <span>Revoke / Cancel Leave</span>
              </button>
            )}

            {/* Rejected leave action: Re-approve */}
            {leave.status === "rejected" && !showReapproveConfirm && (
              <button
                disabled={loading}
                onClick={() => setShowReapproveConfirm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                title="Change status back to approved"
              >
                <Check size={14} />
                <span>Re-approve Leave</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
