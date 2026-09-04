import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import CreateUserModal from "../../components/CreateUserModal";
import { useAuth } from "../../context/AuthContext";
import { UserPlus, CheckCircle, XCircle, Users, ShieldCheck, Briefcase } from "lucide-react";

const VERTICALS = ["All", "Program", "Placement", "EdTech", "Operations", "None"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("all"); // "all" | "operations" | "leadApprovals"
  const [search, setSearch] = useState("");
  const [selectedVertical, setSelectedVertical] = useState("All");
  const [employees, setEmployees] = useState([]);
  
  // Tab-specific state
  const [opsData, setOpsData] = useState({ teamLeaves: [] });
  const [leadLeaves, setLeadLeaves] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchOpsAndLeadLeaves();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/users/all");
      setEmployees(res.data);
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  const fetchOpsAndLeadLeaves = async () => {
    try {
      // Fetch Operations Vertical leaves
      const opsRes = await API.get("/leave/team-dashboard?vertical=Operations");
      setOpsData(opsRes.data);

      // Fetch leaves applied by Vertical Leads
      const leadRes = await API.get("/leave/lead-requests");
      setLeadLeaves(leadRes.data);
    } catch (err) {
      console.error("Failed to fetch approval requests:", err);
    }
  };

  const handleStatusUpdate = async (leaveId, status) => {
    try {
      setActionLoading(leaveId);
      await API.put(`/leave/update-status/${leaveId}`, { status });
      toast.success(`Leave ${status} successfully!`);
      await fetchOpsAndLeadLeaves();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update leave status.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter employees for Tab 1
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase());
    const matchesVertical =
      selectedVertical === "All" || (emp.vertical || "None") === selectedVertical;
    return matchesSearch && matchesVertical;
  });

  const pendingLeadCount = leadLeaves.filter((l) => l.status === "pending").length;
  const pendingOpsCount = (opsData.teamLeaves || []).filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-8 p-2">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-textDark">Admin Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage organization members, Operations vertical, and Vertical Lead approvals.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold px-5 py-3 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition"
        >
          <UserPlus size={18} />
          Create New Member
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-2 font-medium text-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`pb-3 px-4 font-bold transition flex items-center gap-2 ${
            activeTab === "all"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={16} /> All Employees ({employees.length})
        </button>

        <button
          onClick={() => setActiveTab("operations")}
          className={`pb-3 px-4 font-bold transition flex items-center gap-2 ${
            activeTab === "operations"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase size={16} /> Operations Vertical
          {pendingOpsCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingOpsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("leadApprovals")}
          className={`pb-3 px-4 font-bold transition flex items-center gap-2 ${
            activeTab === "leadApprovals"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={16} /> Vertical Leads Approvals
          {pendingLeadCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingLeadCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL EMPLOYEES */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              className="p-3 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm"
            >
              {VERTICALS.map((v) => (
                <option key={v} value={v}>
                  {v === "All" ? "All Verticals" : `${v} Vertical`}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search employee..."
              className="p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="p-4 text-left">Name</th>
                  <th className="p-4 text-left">Email</th>
                  <th className="p-4 text-left">Vertical</th>
                  <th className="p-4 text-left">Casual Used</th>
                  <th className="p-4 text-left">Sick Used</th>
                  <th className="p-4 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center p-6 text-gray-400">
                      No employees found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="border-t hover:bg-gray-50 transition">
                      <td className="p-4 font-medium">{emp.name}</td>
                      <td className="p-4 text-gray-500">{emp.email}</td>
                      <td className="p-4 font-semibold text-indigo-600">
                        {emp.vertical || "None"}
                      </td>
                      <td className="p-4">{emp.leaveBalance?.casual?.taken ?? 0}</td>
                      <td className="p-4">{emp.leaveBalance?.sick?.taken ?? 0}</td>
                      <td className="p-4">
                        <button
                          onClick={() => navigate(`/admin/employee/${emp._id}`)}
                          className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 transition text-xs font-medium"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OPERATIONS VERTICAL (ADMIN MANAGEMENT) */}
      {activeTab === "operations" && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Operations Team Leave Requests</h2>
          <LeaveTableData
            leaves={opsData.teamLeaves || []}
            onAction={handleStatusUpdate}
            actionLoading={actionLoading}
          />
        </div>
      )}

      {/* TAB 3: VERTICAL LEADS APPROVALS */}
      {activeTab === "leadApprovals" && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-slate-100 space-y-4">
          <h2 className="text-lg font-bold text-slate-800">
            Vertical Lead Requests (Requires Admin Approval)
          </h2>
          <LeaveTableData
            leaves={leadLeaves}
            onAction={handleStatusUpdate}
            actionLoading={actionLoading}
            showVertical
          />
        </div>
      )}

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        onUserCreated={() => {
          fetchEmployees();
          fetchOpsAndLeadLeaves();
        }}
      />
    </div>
  );
}

// Sub-component for rendering leave requests table
function LeaveTableData({ leaves, onAction, actionLoading, showVertical }) {
  if (leaves.length === 0) {
    return <div className="text-slate-400 py-8 text-center">No leave applications found.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="bg-slate-50 text-slate-500 uppercase text-xs font-semibold border-b">
            <th className="p-3">Member</th>
            {showVertical && <th className="p-3">Vertical</th>}
            <th className="p-3">Type</th>
            <th className="p-3">Days</th>
            <th className="p-3">Reason</th>
            <th className="p-3">Status</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leaves.map((leave) => (
            <tr key={leave._id} className="hover:bg-slate-50 transition">
              <td className="p-3 font-semibold text-slate-900">
                {leave.user?.name}
                <div className="text-xs text-slate-400 font-normal">{leave.user?.email}</div>
              </td>
              {showVertical && (
                <td className="p-3 font-semibold text-indigo-600">{leave.user?.vertical}</td>
              )}
              <td className="p-3 capitalize font-medium">{leave.type}</td>
              <td className="p-3 font-bold">{leave.days}</td>
              <td className="p-3 max-w-xs truncate text-slate-600">{leave.reason}</td>
              <td className="p-3">
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                    leave.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : leave.status === "rejected"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {leave.status}
                </span>
              </td>
              <td className="p-3 text-right space-x-2 whitespace-nowrap">
                {leave.status === "pending" ? (
                  <>
                    <button
                      disabled={actionLoading === leave._id}
                      onClick={() => onAction(leave._id, "approved")}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      disabled={actionLoading === leave._id}
                      onClick={() => onAction(leave._id, "rejected")}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic">No action needed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}