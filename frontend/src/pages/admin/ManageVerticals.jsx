import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import RecycleBinModal from "../../components/RecycleBinModal";
import { Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { VERTICALS } from "../../constants/leaveConstants";

export default function ManageVerticals() {
  const [users, setUsers] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [isTrashOpen, setIsTrashOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users/all");
      setUsers(res.data);
    } catch (err) {
        console.error("Error fetching users:", err);
      toast.error("Failed to load user list");
    }
  };

  const handleVerticalChange = async (id, newVertical) => {
    try {
      setLoadingId(id);
      await API.put(`/users/update-vertical/${id}`, { vertical: newVertical });
      toast.success(`Updated to ${newVertical} Vertical & migrated leave records.`);
      await fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update vertical");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSoftDelete = async () => {
    if (!deleteModalUser) return;
    try {
      setLoadingId(deleteModalUser._id);
      await API.put(`/users/soft-delete/${deleteModalUser._id}`);
      toast.success(`${deleteModalUser.name} removed from organization.`);
      setDeleteModalUser(null);
      await fetchUsers();
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Failed to delete member.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-2 sm:p-6 space-y-5 sm:space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 pb-4 gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight">
            Manage Verticals & Members
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Reassign employee verticals or remove team members from the portal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Recycle Bin Trigger Button */}
          <button
            onClick={() => setIsTrashOpen(true)}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
            <Trash2 size={15} className="text-rose-500" />
            <span>Recycle Bin</span>
          </button>
        <button
          onClick={fetchUsers}
          className="p-2 sm:p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
          <RefreshCw size={14} /> <span>Refresh</span>
        </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-x-auto border border-slate-100">
        <table className="w-full text-xs sm:text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] sm:text-xs font-semibold border-b border-slate-100">
            <tr>
              <th className="p-3 sm:p-4 whitespace-nowrap">Member</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Email</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Designation</th>
              <th className="p-3 sm:p-4 whitespace-nowrap">Assigned Vertical</th>
              <th className="p-3 sm:p-4 text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50 transition">
                <td className="p-3 sm:p-4 font-bold text-slate-900 whitespace-nowrap">{user.name}</td>
                <td className="p-3 sm:p-4 text-slate-500 text-xs whitespace-nowrap">{user.email}</td>
                <td className="p-3 sm:p-4 text-slate-600 text-xs font-medium whitespace-nowrap">{user.jobRole || "—"}</td>
                <td className="p-3 sm:p-4 whitespace-nowrap">
                  <select
                    disabled={loadingId === user._id}
                    value={user.vertical}
                    onChange={(e) => handleVerticalChange(user._id, e.target.value)}
                    className="p-1.5 sm:p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    {VERTICALS.map((v) => (
                      <option key={v} value={v}>
                        {v} Vertical
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-3 sm:p-4 text-right whitespace-nowrap">
                  <button
                    disabled={loadingId === user._id}
                    onClick={() => setDeleteModalUser(user)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition cursor-pointer disabled:opacity-50"
                    title="Soft Delete Member"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalUser && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex justify-center items-center z-[100] p-2 sm:p-4 animate-fadeIn">
    <div className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative p-4 sm:p-6 space-y-4 sm:space-y-5 max-h-[92vh] overflow-y-auto">
      
      {/* Icon & Title */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 sm:pb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <AlertTriangle size={22} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Remove Team Member</h3>
          <p className="text-xs text-slate-400 font-medium">Deactivate account access</p>
        </div>
      </div>

      {/* Message Box */}
      <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
          Are you sure you want to remove <strong className="text-slate-900">{deleteModalUser.name}</strong>?
        </p>
        <p className="text-[11px] sm:text-xs text-slate-400 font-normal">
          ({deleteModalUser.email})
        </p>
      </div>

      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-normal">
        • The user will no longer be able to log in.<br />
        • All historical leave records will remain preserved.<br />
        • Account can be restored anytime from the <strong className="text-slate-700">Recycle Bin</strong>.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
        <button
          onClick={() => setDeleteModalUser(null)}
          className="w-full sm:flex-1 py-2.5 sm:py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSoftDelete}
          className="w-full sm:flex-1 py-2.5 sm:py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-200 cursor-pointer"
        >
          Confirm Delete
        </button>
      </div>

    </div>
  </div>,
    document.body // Portal Target
      )}
    {/* Recycle Bin Modal */}
      <RecycleBinModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        onUserRestored={fetchUsers}
      />
    </div>

  );
}