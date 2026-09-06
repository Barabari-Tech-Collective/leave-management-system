import React, { useState } from "react";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import { X, AlertTriangle } from "lucide-react";

export default function LeaveApprovalActions({ leaveId, onStatusUpdated }) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  // 1. Handle Direct Approval
  const handleApprove = async () => {
    try {
      setLoading(true);
      await API.put(`/leave/status/${leaveId}`, { status: "approved" });
      toast.success("Leave request approved! ✅");
      onStatusUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to approve leave");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Rejection Submission
  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }

    try {
      setLoading(true);
      await API.put(`/leave/status/${leaveId}`, {
        status: "rejected",
        rejectionReason: rejectionReason.trim(),
      });
      toast.success("Leave request rejected & notification email sent.");
      setShowRejectModal(false);
      setRejectionReason("");
      onStatusUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reject leave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Review Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          disabled={loading}
          onClick={handleApprove}
          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
        >
          Approve
        </button>
        <button
          disabled={loading}
          onClick={() => setShowRejectModal(true)}
          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
        >
          Reject
        </button>
      </div>

      {/* Rejection Reason Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
                <AlertTriangle size={20} />
                <span>Reject Leave Request</span>
              </div>
              <button
                onClick={() => setShowRejectModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Reason for Rejection <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Critical project release scheduled on selected dates."
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-xs text-slate-800 bg-slate-50 resize-none font-medium"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-rose-200 cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}