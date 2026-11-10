import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import API from "../api/axiosConfig";
import StatusBadge from "./StatusBadge";
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileText,
  Ban
} from "lucide-react";

export default function EmployeeHistoryModal({ isOpen, onClose, employee }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [historyData, setHistoryData] = useState({
    employee: null,
    leaveBalance: null,
    leaves: []
  });

  const fetchEmployeeHistory = useCallback(async (employeeId) => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get(`/leave/employee/${employeeId}`);
      setHistoryData({
        employee: res.data.employee || employee,
        leaveBalance: res.data.leaveBalance || employee?.leaveBalance,
        leaves: res.data.leaves || []
      });
    } catch (err) {
      console.error("Failed to load employee leave history:", err);
      setError(err.response?.data?.message || "Failed to load leave history.");
    } finally {
      setLoading(false);
    }
  }, [employee]);

  useEffect(() => {
    if (isOpen && employee?._id) {
      fetchEmployeeHistory(employee._id);
    }
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, employee?._id, fetchEmployeeHistory]);

  if (!isOpen || !employee) return null;

  const balances = historyData.leaveBalance || employee.leaveBalance;

  const casualTotal = balances?.casual?.total ?? 11;
  const casualTaken = balances?.casual?.taken ?? 0;
  const casualRemaining = Math.max(0, casualTotal - casualTaken);

  const sickTotal = balances?.sick?.total ?? 10;
  const sickTaken = balances?.sick?.taken ?? 0;
  const sickRemaining = Math.max(0, sickTotal - sickTaken);

  const flexibleTotal = balances?.flexible?.total ?? 5;
  const flexibleTaken = balances?.flexible?.taken ?? 0;
  const flexibleRemaining = Math.max(0, flexibleTotal - flexibleTaken);

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-2 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-sm shrink-0">
              {employee.name ? employee.name.charAt(0).toUpperCase() : <User size={18} />}
            </div>
            <div className="truncate">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{employee.name}'s Leave Record</h3>
              <p className="text-xs text-slate-500 mt-0.5 truncate">{employee.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition cursor-pointer shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 overflow-y-auto">
          {/* Balance Cards Summary */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Leave Balances Overview
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Casual */}
              <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-2xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-indigo-700">Casual Leave</span>
                  <span className="text-[11px] font-semibold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-indigo-200">
                    {casualRemaining} left
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-indigo-950">{casualTaken}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {casualTotal} used</span>
                </div>
              </div>

              {/* Sick */}
              <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-2xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-700">Sick Leave</span>
                  <span className="text-[11px] font-semibold text-rose-600 bg-white px-2 py-0.5 rounded-md border border-rose-200">
                    {sickRemaining} left
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-rose-950">{sickTaken}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {sickTotal} used</span>
                </div>
              </div>

              {/* Flexible */}
              <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700">Flexible Cultural</span>
                  <span className="text-[11px] font-semibold text-emerald-600 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {flexibleRemaining} left
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-emerald-950">{flexibleTaken}</span>
                  <span className="text-xs text-slate-500 font-medium">/ {flexibleTotal} used</span>
                </div>
              </div>

              {/* Extra Leaves */}
              <div className="bg-amber-50/70 border border-amber-200 p-4 rounded-2xl space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-800">Extra Leaves</span>
                  <span className="text-[11px] font-semibold text-amber-700 bg-white px-2 py-0.5 rounded-md border border-amber-300">
                    Extra Leave
                  </span>
                </div>
                <div className="flex items-baseline gap-1.5 pt-1">
                  <span className="text-2xl font-black text-amber-950">{balances?.extra?.taken ?? 0}</span>
                  <span className="text-xs text-slate-500 font-medium">days taken</span>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Applications History Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Application History ({historyData.leaves.length})
              </h4>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <p className="text-xs font-medium">Loading history...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            ) : historyData.leaves.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 text-slate-400 text-xs">
                No leave requests found for this employee.
              </div>
            ) : (
              <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                      <tr>
                        <th className="py-3 px-4">Type</th>
                        <th className="py-3 px-4">Dates</th>
                        <th className="py-3 px-4">Days</th>
                        <th className="py-3 px-4">Reason</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyData.leaves.map((item) => (
                        <tr key={item._id} className="hover:bg-slate-50/60 transition">
                          <td className="py-3 px-4 font-bold text-slate-800 capitalize">
                            {item.type}
                          </td>
                          <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                            {item.from} - {item.to}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {item.days}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-xs break-words" title={item.reason}>
                            {item.reason || <span className="italic text-slate-400">No reason</span>}
                            {item.rejectionReason && (
                              <div className="mt-1 text-[11px] text-rose-600 font-medium">
                                Rejected: {item.rejectionReason}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <StatusBadge status={item.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 transition cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

