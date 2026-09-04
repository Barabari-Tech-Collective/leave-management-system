import { useState, useEffect } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { ShieldCheck, UserCheck, UserPlus, RefreshCw } from "lucide-react";

const VERTICALS = ["Program", "Placement", "EdTech", "Operations", "None"];

export default function AdminVerticalLead() {
  const [users, setUsers] = useState([]);
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await API.get("/users/all");
      setUsers(res.data);
    } catch (err) {
      toast.error("Failed to load user list");
      console.log("Error fetching users:", err);
    }
  };

  const handleUpdateLead = async (id, currentLeadStatus, currentVertical) => {
    if (currentVertical === "None" && !currentLeadStatus) {
      toast.error("Please assign a vertical before making user a Vertical Lead.");
      return;
    }

    try {
      setLoadingId(id);
      await API.put(`/users/update-lead/${id}`, {
        isVerticalLead: !currentLeadStatus,
        vertical: currentVertical,
      });

      toast.success(
        !currentLeadStatus
          ? `Assigned as Vertical Lead for ${currentVertical}`
          : "Removed Vertical Lead status"
      );

      // Re-fetch so any demoted previous lead updates automatically in UI
      await fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update lead status");
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerticalChange = async (id, newVertical, currentLeadStatus) => {
    try {
      setLoadingId(id);
      await API.put(`/users/update-lead/${id}`, {
        isVerticalLead: currentLeadStatus,
        vertical: newVertical,
      });

      toast.success(`Vertical updated to ${newVertical}`);
      await fetchUsers();
    } catch (err) {
      console.error("Error updating vertical:", err);
      toast.error("Failed to update vertical");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Manage Vertical Leads & Governance
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Assign team verticals and designate vertical leads (Only 1 lead permitted per vertical).
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition flex items-center gap-2 text-xs font-bold"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* User List */}
      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition gap-4"
          >
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${
                  user.isVerticalLead
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                    : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                }`}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                  {user.isVerticalLead && (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      LEAD
                    </span>
                  )}
                  {user.jobRole && (
                    <span className="text-xs text-slate-400 font-medium">
                      • {user.jobRole}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">{user.email}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {/* Vertical Selector */}
              <select
                value={user.vertical || "None"}
                onChange={(e) =>
                  handleVerticalChange(
                    user._id,
                    e.target.value,
                    user.isVerticalLead
                  )
                }
                className="p-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>
                    {v} Vertical
                  </option>
                ))}
              </select>

              {/* Toggle Lead Button (Modernized UI) */}
              <button
                disabled={loadingId === user._id}
                onClick={() =>
                  handleUpdateLead(
                    user._id,
                    user.isVerticalLead,
                    user.vertical
                  )
                }
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 ${
                  user.isVerticalLead
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                    : "bg-white border border-indigo-300 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400"
                }`}
              >
                {user.isVerticalLead ? (
                  <>
                    <ShieldCheck size={15} /> Vertical Lead ✓
                  </>
                ) : (
                  <>
                    <UserPlus size={15} /> Promote to Lead
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}