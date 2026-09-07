import React, { useState, useEffect } from "react";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import { Trash2, RotateCcw, X, UserX } from "lucide-react";

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-800 rounded-xl border border-slate-700">
              <Trash2 size={20} className="text-rose-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Recycle Bin</h2>
              <p className="text-xs text-slate-400 font-medium">
                Deactivated users are kept here. You can restore them anytime.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : deletedUsers.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <UserX size={40} className="mx-auto text-slate-300" />
              <p className="text-sm font-semibold text-slate-500">Recycle Bin is empty</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100">
                    <th className="p-3">Member</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Vertical</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deletedUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-slate-50/50 transition">
                      <td className="p-3 font-bold text-slate-800">{user.name}</td>
                      <td className="p-3 text-slate-500 text-xs">{user.email}</td>
                      <td className="p-3 font-semibold text-indigo-600">{user.vertical}</td>
                      <td className="p-3 text-right">
                        <button
                          disabled={actionLoadingId === user._id}
                          onClick={() => handleRestore(user._id, user.name)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto cursor-pointer disabled:opacity-50"
                        >
                          <RotateCcw size={14} /> Restore User
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}