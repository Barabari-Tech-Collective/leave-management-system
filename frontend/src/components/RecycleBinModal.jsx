import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import { Trash2, RotateCcw, X, UserX, Sparkles } from "lucide-react";

export default function RecycleBinModal({ isOpen, onClose, onUserRestored }) {
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchDeletedUsers();
    }
  }, [isOpen]);

  const fetchDeletedUsers = async () => {
    try {
      setLoading(true);
      const res = await API.get("/users/deleted");
      setDeletedUsers(res.data);
    } catch (err) {
        console.error("Error fetching deleted users:", err);
      toast.error("Failed to load deleted users list.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (userId, name) => {
    try {
      setActionLoadingId(userId);
      await API.put(`/users/restore/${userId}`);
      toast.success(`${name}'s account restored successfully! 🎉`);
      await fetchDeletedUsers();
      onUserRestored();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to restore user.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex justify-between items-center relative">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
              <Trash2 size={22} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Recycle Bin</h2>
              <p className="text-xs text-slate-300 mt-0.5 font-medium">
                Deactivated accounts are preserved here. You can restore them anytime.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-9 w-9 border-b-2 border-indigo-600"></div>
            </div>
          ) : deletedUsers.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <UserX size={32} />
              </div>
              <p className="text-sm font-bold text-slate-700">Recycle Bin is Empty</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                No soft-deleted members found in the organization vault.
              </p>
            </div>
          ) : (
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-100/70 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200/60">
                    <th className="p-4">Member</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Vertical</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-white transition">
                      <td className="p-4 font-bold text-slate-900">{user.name}</td>
                      <td className="p-4 text-slate-500 text-xs">{user.email}</td>
                      <td className="p-4 font-semibold text-indigo-600">{user.vertical}</td>
                      <td className="p-4 text-right">
                        <button
                          disabled={actionLoadingId === user._id}
                          onClick={() => handleRestore(user._id, user.name)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer shadow-xs shadow-emerald-200 disabled:opacity-50"
                        >
                          <RotateCcw size={14} /> Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
}