import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import RecycleBinModal from "../../components/RecycleBinModal";
import { Trash2, Layers, RefreshCw, AlertTriangle } from "lucide-react";

const VERTICALS = ["Program", "Placement", "EdTech", "Operations"];

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
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Manage Verticals & Members
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Reassign employee verticals or remove team members from the portal.
          </p>
        </div>
        <div>
        {/* Recycle Bin Trigger Button */}
          <button
            onClick={() => setIsTrashOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
            >
            <Trash2 size={15} className="text-rose-500" />
            Recycle Bin
          </button>
        <button
          onClick={fetchUsers}
          className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
          >
          <RefreshCw size={14} /> Refresh
        </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-x-auto border border-slate-100">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b border-slate-100">
            <tr>
              <th className="p-4">Member</th>
              <th className="p-4">Email</th>
              <th className="p-4">Designation</th>
              <th className="p-4">Assigned Vertical</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-slate-50 transition">
                <td className="p-4 font-bold text-slate-900">{user.name}</td>
                <td className="p-4 text-slate-500 text-xs">{user.email}</td>
                <td className="p-4 text-slate-600 text-xs font-medium">{user.jobRole || "—"}</td>
                <td className="p-4">
                  <select
                    disabled={loadingId === user._id}
                    value={user.vertical}
                    onChange={(e) => handleVerticalChange(user._id, e.target.value)}
                    className="p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:opacity-50"
                  >
                    {VERTICALS.map((v) => (
                      <option key={v} value={v}>
                        {v} Vertical
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-4 text-right">
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-fadeIn">
    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative p-6 space-y-5">
      
      {/* Icon & Title */}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-slate-900">Remove Team Member</h3>
          <p className="text-xs text-slate-400 font-medium">Deactivate account access</p>
        </div>
      </div>

      {/* Message Box */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
        <p className="text-[14px] text-slate-600 font-medium leading-relaxed">
          Are you sure you want to remove <strong className="text-slate-900">{deleteModalUser.name}</strong>?
        </p>
        <p className="text-[12px] text-slate-400 font-normal">
          ({deleteModalUser.email})
        </p>
      </div>

      <p className="text-[12px] text-slate-500 font-medium leading-normal">
        • The user will no longer be able to log in.<br />
        • All historical leave records will remain preserved.<br />
        • Account can be restored anytime from the <strong className="text-slate-700">Recycle Bin</strong>.
      </p>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => setDeleteModalUser(null)}
          className="flex-1 py-3 bg-slate-200 hover:bg-slate-400 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleSoftDelete}
          className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-rose-200 cursor-pointer"
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