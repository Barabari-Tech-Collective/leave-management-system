import { useState, useEffect } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { ShieldCheck, UserPlus, RefreshCw } from "lucide-react";

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
      console.log("Error fetching users:", err);
      toast.error("Failed to load user list");
    }
  };

  const handleToggleLead = async (id, currentLeadStatus, vertical) => {
    try {
      setLoadingId(id);
      await API.put(`/users/update-lead/${id}`, {
        isVerticalLead: !currentLeadStatus,
        vertical,
      });

      toast.success(
        !currentLeadStatus
          ? `Promoted to Vertical Lead for ${vertical}`
          : "Demoted from Vertical Lead"
      );

      await fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update lead status");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto animate-fadeIn">
      <div className="flex justify-between items-center border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Manage Vertical Leads
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Promote or demote designated single-leads for each vertical.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-xl transition flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="space-y-3">
        {users.map((user) => (
          <div
            key={user._id}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition gap-4"
          >
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
                <p className="text-xs text-slate-500 font-medium">
                  {user.email} <span className="text-indigo-600 font-bold ml-1">({user.vertical} Vertical)</span>
                </p>
              </div>
            </div>

            <button
              disabled={loadingId === user._id}
              onClick={() => handleToggleLead(user._id, user.isVerticalLead, user.vertical)}
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
        ))}
      </div>
    </div>
  );
}