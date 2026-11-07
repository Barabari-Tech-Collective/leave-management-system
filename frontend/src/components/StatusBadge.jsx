import React from "react";
import { CheckCircle2, Clock, XCircle, Ban } from "lucide-react";

export default function StatusBadge({ status }) {
  const normStatus = String(status || "pending").trim().toLowerCase();

  const isSuccess = normStatus === "approved" || normStatus === "success";
  const isRejected = normStatus === "rejected";
  const isCancelled = normStatus === "cancelled";

  if (isSuccess) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-green-100 text-green-800 border border-green-300 shadow-2xs">
        <CheckCircle2 size={13} className="text-green-700" />
        {normStatus === "success" ? "Success" : "Approved"}
      </span>
    );
  }

  if (isRejected) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-red-100 text-red-800 border border-red-300 shadow-2xs">
        <XCircle size={13} className="text-red-700" />
        Rejected
      </span>
    );
  }

  if (isCancelled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-slate-100 text-slate-600 border border-slate-300 shadow-2xs">
        <Ban size={13} className="text-slate-500" />
        Cancelled
      </span>
    );
  }

  // Pending (yellow color)
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide bg-yellow-100 text-yellow-800 border border-yellow-300 shadow-2xs">
      <Clock size={13} className="text-yellow-700" />
      Pending
    </span>
  );
}
