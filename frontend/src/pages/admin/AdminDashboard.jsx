import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import CreateUserModal from "../../components/CreateUserModal";
import { useAuth } from "../../context/AuthContext";
import LeaveDetailsModal from "../../components/LeaveDetailsModal";
import StatusBadge from "../../components/StatusBadge";
import EmailRetryButton from "../../components/EmailRetryButton";
import LeaveFilterBar from "../../components/LeaveFilterBar";
import { 
  UserPlus, 
  CheckCircle, 
  CheckCircle2, 
  XCircle, 
  Users, 
  ShieldCheck, 
  Layers, 
  Briefcase, 
  Eye, 
  AlertCircle, 
  Loader2 
} from "lucide-react";

const VERTICALS = ["All", "Program", "Placement", "EdTech", "Operations", "None"];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [activeTab, setActiveTab] = useState("all"); // "all" | "operations" | "leadApprovals"
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedVertical, setSelectedVertical] = useState("All");
  const [employees, setEmployees] = useState([]);
  
  // Tab-specific state
  const [opsData, setOpsData] = useState({ teamLeaves: [] });
  const [leadLeaves, setLeadLeaves] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState(null);
  const [retryingDecisionId, setRetryingDecisionId] = useState(null);
  const [decisionCooldowns, setDecisionCooldowns] = useState({});

  // Vertical Lead Requests Filter State
  const [leadYearFilter, setLeadYearFilter] = useState("all");
  const [leadMonthFilter, setLeadMonthFilter] = useState("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [leadAvailableYears, setLeadAvailableYears] = useState([new Date().getFullYear()]);
  const [leadTableLoading, setLeadTableLoading] = useState(false);
  const [leadPendingCount, setLeadPendingCount] = useState(0);

  // Countdown timer for decision email cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setDecisionCooldowns((prev) => {
        let changed = false;
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (updated[id] > 1) {
            updated[id] -= 1;
            changed = true;
          } else {
            delete updated[id];
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleResendDecisionEmail = async (leaveId) => {
    if (retryingDecisionId === leaveId || (decisionCooldowns[leaveId] > 0)) return;

    try {
      setRetryingDecisionId(leaveId);
      const res = await API.post(`/leave/resend-decision-email/${leaveId}`);
      toast.success(res.data?.message || "Notification email dispatched successfully!");

      setSelectedLeaveForDetails((prev) =>
        prev && prev._id === leaveId
          ? { ...prev, decisionEmailStatus: "sent", decisionEmailError: "" }
          : prev
      );

      // Instantly update lead leaves state
      setLeadLeaves((prev) =>
        prev.map((l) =>
          l._id === leaveId
            ? { ...l, decisionEmailStatus: "sent", decisionEmailError: "" }
            : l
        )
      );

      // Instantly update Operations vertical state
      setOpsData((prev) => ({
        ...prev,
        teamLeaves: (prev.teamLeaves || []).map((l) =>
          l._id === leaveId
            ? { ...l, decisionEmailStatus: "sent", decisionEmailError: "" }
            : l
        )
      }));
    } catch (err) {
      const remainingSeconds = err.response?.data?.remainingSeconds;
      if (err.response?.status === 429 && remainingSeconds) {
        setDecisionCooldowns((prev) => ({ ...prev, [leaveId]: remainingSeconds }));
      } else {
        toast.error(err.response?.data?.message || "Failed to dispatch email.");
        setDecisionCooldowns((prev) => ({ ...prev, [leaveId]: 5 }));
      }
    } finally {
      setRetryingDecisionId(null);
    }
  };
  
  useEffect(() => {
    fetchAllDashboardData();
  }, []);

  // Combined fetch function using Promise.all to prevent loading state flicker
  const fetchAllDashboardData = async () => {
    try {
      setLoading(true);
      const [empRes, opsRes, leadRes] = await Promise.all([
        API.get("/users/all"),
        API.get("/leave/team-dashboard?vertical=Operations"),
        API.get("/leave/lead-requests")
      ]);

      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setOpsData(opsRes.data || { teamLeaves: [] });

      const leadLeavesData = leadRes.data?.leadLeaves || (Array.isArray(leadRes.data) ? leadRes.data : []);
      setLeadLeaves(leadLeavesData);
      if (leadRes.data?.availableYears && Array.isArray(leadRes.data.availableYears)) {
        setLeadAvailableYears(leadRes.data.availableYears);
      }
      if (leadRes.data?.pendingCount !== undefined) {
        setLeadPendingCount(leadRes.data.pendingCount);
      } else {
        setLeadPendingCount(leadLeavesData.filter((l) => l.status === "pending").length);
      }
    } catch (err) {
      if (err.response?.status === 401) return;
      console.error("Failed to fetch admin dashboard data:", err);
      toast.error("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filtered fetch for Vertical Lead Requests
  const fetchLeadLeaves = async (
    yr = leadYearFilter,
    mo = leadMonthFilter,
    st = leadStatusFilter,
    silent = false
  ) => {
    try {
      if (!silent) setLeadTableLoading(true);
      const params = new URLSearchParams();
      if (yr !== "all") params.append("year", yr);
      if (mo !== "all") params.append("month", mo);
      if (st !== "all") params.append("status", st);

      const res = await API.get(`/leave/lead-requests?${params.toString()}`);
      const leaves = res.data?.leadLeaves || (Array.isArray(res.data) ? res.data : []);
      setLeadLeaves(leaves);
      if (res.data?.availableYears && Array.isArray(res.data.availableYears)) {
        setLeadAvailableYears(res.data.availableYears);
      }
      if (res.data?.pendingCount !== undefined) {
        setLeadPendingCount(res.data.pendingCount);
      }
    } catch (err) {
      console.error("Failed to fetch lead leaves:", err);
      toast.error("Failed to load vertical lead leave requests");
    } finally {
      setLeadTableLoading(false);
    }
  };

  const handleLeadYearChange = (yr) => {
    setLeadYearFilter(yr);
    fetchLeadLeaves(yr, leadMonthFilter, leadStatusFilter);
  };

  const handleLeadMonthChange = (mo) => {
    setLeadMonthFilter(mo);
    fetchLeadLeaves(leadYearFilter, mo, leadStatusFilter);
  };

  const handleLeadStatusChange = (st) => {
    setLeadStatusFilter(st);
    fetchLeadLeaves(leadYearFilter, leadMonthFilter, st);
  };

  const resetLeadFilters = () => {
    setLeadYearFilter("all");
    setLeadMonthFilter("all");
    setLeadStatusFilter("all");
    fetchLeadLeaves("all", "all", "all");
  };

  const hasActiveLeadFilters = leadYearFilter !== "all" || leadMonthFilter !== "all" || leadStatusFilter !== "all";

  const handleLeaveStatusUpdated = async () => {
    await Promise.all([
      fetchLeadLeaves(leadYearFilter, leadMonthFilter, leadStatusFilter, true),
      API.get("/leave/team-dashboard?vertical=Operations").then((opsRes) => setOpsData(opsRes.data || { teamLeaves: [] }))
    ]);
  };
  //   useEffect(() => {
  //     fetchEmployees();
  //     fetchOpsAndLeadLeaves();
  //   }, []);
  // const fetchEmployees = async () => {
  //   try {
  //     setLoading(true);
  //     const res = await API.get("/users/all");
  //     setEmployees(res.data);
  //   } catch (err) {
  //     console.error("Failed to fetch employees:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const fetchOpsAndLeadLeaves = async () => {
  //   try {
  //     // Fetch Operations Vertical leaves
  //     setLoading(true);
  //     const opsRes = await API.get("/leave/team-dashboard?vertical=Operations");
  //     setOpsData(opsRes.data);

  //     // Fetch leaves applied by Vertical Leads
  //     const leadRes = await API.get("/leave/lead-requests");
  //     setLeadLeaves(leadRes.data);
  //   } catch (err) {
  //     console.error("Failed to fetch approval requests:", err);
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  // const handleStatusUpdate = async (leaveId, status) => {
  //   try {
  //     setActionLoading(leaveId);
  //     await API.put(`/leave/update-status/${leaveId}`, { status });
  //     toast.success(`Leave ${status} successfully!`);
  //     await fetchOpsAndLeadLeaves();
  //   } catch (err) {
  //     toast.error(err.response?.data?.message || "Failed to update leave status.");
  //   } finally {
  //     setActionLoading(null);
  //   }
  // };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  // Filter employees for Tab 1
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase());
    const matchesVertical =
      selectedVertical === "All" || (emp.vertical || "None") === selectedVertical;
    return matchesSearch && matchesVertical;
  });

  const pendingOpsCount = (opsData.teamLeaves || []).filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-6 sm:space-y-8 p-1 sm:p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-textDark">Admin Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Manage organization members, Operations vertical, and Vertical Lead approvals.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="w-full sm:w-auto justify-center flex items-center gap-2 bg-gradient-to-r from-primary to-indigo-600 text-white font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition cursor-pointer text-xs sm:text-sm"
        >
          <UserPlus size={18} />
          <span>Create New Member</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 sm:gap-2 font-medium text-xs sm:text-sm">
        <button
          onClick={() => setActiveTab("all")}
          className={`py-2.5 px-3 sm:pb-3 sm:px-4 font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === "all"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Users size={16} /> <span>All Employees ({employees.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("operations")}
          className={`py-2.5 px-3 sm:pb-3 sm:px-4 font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === "operations"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <Briefcase size={16} /> <span>Operations Vertical</span>
          {pendingOpsCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {pendingOpsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("leadApprovals")}
          className={`py-2.5 px-3 sm:pb-3 sm:px-4 font-bold transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
            activeTab === "leadApprovals"
              ? "border-b-2 border-primary text-primary"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <ShieldCheck size={16} /> <span>Vertical Leads Approvals</span>
          {leadPendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {leadPendingCount}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: ALL EMPLOYEES */}
      {activeTab === "all" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <select
              value={selectedVertical}
              onChange={(e) => setSelectedVertical(e.target.value)}
              className="p-2.5 sm:p-3 border rounded-xl bg-white text-xs sm:text-sm outline-none focus:ring-2 focus:ring-primary shadow-xs w-full sm:w-auto cursor-pointer"
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
              className="p-2.5 sm:p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none text-xs sm:text-sm w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-2xl shadow-md overflow-x-auto border border-slate-100">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[11px] sm:text-xs">
                <tr>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Name</th>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Email</th>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Vertical</th>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Casual Used</th>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Sick Used</th>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Flexible Used</th>
                  <th className="p-3 sm:p-4 text-left whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center p-6 text-gray-400">
                      No employees found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => (
                    <tr key={emp._id} className="border-t hover:bg-gray-50 transition">
                      <td className="p-3 sm:p-4 font-medium whitespace-nowrap">{emp.name}</td>
                      <td className="p-3 sm:p-4 text-gray-500 whitespace-nowrap">{emp.email}</td>
                      <td className="p-3 sm:p-4 font-semibold text-indigo-600 whitespace-nowrap">{emp.vertical}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{emp.leaveBalance?.casual?.taken ?? 0}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{emp.leaveBalance?.sick?.taken ?? 0}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">{emp.leaveBalance?.flexible?.taken ?? 0}</td>
                      <td className="p-3 sm:p-4 whitespace-nowrap">
                        <button
                          onClick={() => navigate(`/admin/employee/${emp._id}`)}
                          className="bg-primary text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl hover:scale-105 transition text-xs font-medium cursor-pointer"
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

      {/* TAB 2: OPERATIONS VERTICAL */}
      {activeTab === "operations" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md p-4 sm:p-6 border border-slate-100 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-slate-800">Operations Team Leave Requests</h2>
          <LeaveTableData
            leaves={opsData.teamLeaves || []}
            onRefresh={fetchAllDashboardData}
            onViewLeave={(leave) => setSelectedLeaveForDetails(leave)}
            onResendEmail={handleResendDecisionEmail}
            retryingId={retryingDecisionId}
            cooldowns={decisionCooldowns}
          />
        </div>
      )}

      {/* TAB 3: VERTICAL LEADS APPROVALS */}
      {activeTab === "leadApprovals" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md p-4 sm:p-6 border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Vertical Lead Requests (Requires Admin Approval)
                </h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  {hasActiveLeadFilters 
                    ? `Filtered: ${leadLeaves.length} results` 
                    : `${leadLeaves.length} Total`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Review and approve leave requests submitted by designated Vertical Leads.
              </p>
            </div>

            <LeaveFilterBar
              yearFilter={leadYearFilter}
              onYearChange={handleLeadYearChange}
              availableYears={leadAvailableYears}
              monthFilter={leadMonthFilter}
              onMonthChange={handleLeadMonthChange}
              statusFilter={leadStatusFilter}
              onStatusChange={handleLeadStatusChange}
              onReset={resetLeadFilters}
              hasActiveFilters={hasActiveLeadFilters}
            />
          </div>

          <LeaveTableData
            leaves={leadLeaves}
            loading={leadTableLoading}
            onRefresh={fetchAllDashboardData}
            onViewLeave={(leave) => setSelectedLeaveForDetails(leave)}
            onResendEmail={handleResendDecisionEmail}
            retryingId={retryingDecisionId}
            cooldowns={decisionCooldowns}
            showVertical
            emptyMessage={
              hasActiveLeadFilters
                ? "No vertical lead requests match the selected filters."
                : "No leave applications found from vertical leads."
            }
            onResetFilters={hasActiveLeadFilters ? resetLeadFilters : null}
          />
        </div>
      )}

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        onUserCreated={fetchAllDashboardData}
      />

      {/* Reusable Leave Management Details Modal for Admin */}
      {selectedLeaveForDetails && (
        <LeaveDetailsModal
          isOpen={!!selectedLeaveForDetails}
          onClose={() => setSelectedLeaveForDetails(null)}
          leave={selectedLeaveForDetails}
          onStatusUpdated={handleLeaveStatusUpdated}
          onResendDecisionEmail={handleResendDecisionEmail}
          isRetryingDecisionEmail={retryingDecisionId === selectedLeaveForDetails?._id}
          decisionEmailCooldownSeconds={selectedLeaveForDetails ? (decisionCooldowns[selectedLeaveForDetails._id] || 0) : 0}
        />
      )}
    </div>
  );
}

// Sub-component rendering Leave Table with full View / Manage actions
function LeaveTableData({
  leaves = [],
  loading = false,
  onViewLeave,
  showVertical = false,
  onResendEmail,
  retryingId = null,
  cooldowns = {},
  emptyMessage = "No leave applications found.",
  onResetFilters = null
}) {
  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
        <p className="text-xs font-medium">Loading requests...</p>
      </div>
    );
  }

  if (leaves.length === 0) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-2">
        <p className="text-sm font-medium">{emptyMessage}</p>
        {onResetFilters && (
          <button
            onClick={onResetFilters}
            className="text-xs text-primary font-bold hover:underline cursor-pointer"
          >
            Reset filters to view all
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs sm:text-sm border-collapse">
        <thead>
          <tr className="bg-slate-50 text-slate-500 uppercase text-[11px] sm:text-xs font-semibold border-b border-slate-100">
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Member</th>
            {showVertical && <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Vertical</th>}
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Type</th>
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Dates</th>
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Days</th>
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Status</th>
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 whitespace-nowrap">Email Confirmation</th>
            <th className="py-3 px-3 sm:py-3.5 sm:px-4 text-right whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {leaves.map((leave) => {
            const isEmailNotApplicable =
              leave.status === "pending" ||
              leave.status === "cancelled" ||
              leave.isPastLeave ||
              !leave.decisionEmailStatus ||
              leave.decisionEmailStatus === "none";

            return (
              <tr key={leave._id} className="hover:bg-slate-50/70 transition">
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                  {leave.user?.name || "Unknown"}
                  <div className="text-xs text-slate-400 font-normal">{leave.user?.email}</div>
                </td>
                {showVertical && (
                  <td className="py-3.5 px-3 sm:py-4 sm:px-4 font-semibold text-indigo-600 whitespace-nowrap">
                    {leave.user?.vertical || leave.vertical}
                  </td>
                )}
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="capitalize font-semibold text-slate-700">{leave.type}</span>
                    {leave.isPastLeave && (
                      <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Past Leave
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 text-slate-600 whitespace-nowrap">
                  {new Date(leave.fromDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })} -{" "}
                  {new Date(leave.toDate).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })}
                </td>
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 font-bold text-slate-800 whitespace-nowrap">
                  {leave.days} {leave.days === 1 ? "day" : "days"}
                </td>
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 whitespace-nowrap">
                  <StatusBadge status={leave.status} />
                </td>
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 whitespace-nowrap">
                  {isEmailNotApplicable ? (
                    <span className="text-gray-400 font-bold text-sm px-2">-</span>
                  ) : leave.decisionEmailStatus === "failed" ? (
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                        title={leave.decisionEmailError || "Status email delivery failed"}
                      >
                        <AlertCircle size={12} className="text-rose-600" />
                        Failed
                      </span>
                      {onResendEmail && (
                        <EmailRetryButton
                          onRetry={() => onResendEmail(leave._id)}
                          isRetrying={retryingId === leave._id}
                          cooldownSeconds={cooldowns[leave._id] || 0}
                          size="xs"
                        />
                      )}
                    </div>
                  ) : leave.decisionEmailStatus === "sent" ? (
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                      title="Notification email sent to employee"
                    >
                      <CheckCircle2 size={12} className="text-emerald-600" />
                      Sent
                    </span>
                  ) : (
                    <span className="text-gray-400 font-bold text-sm px-2">-</span>
                  )}
                </td>
                <td className="py-3.5 px-3 sm:py-4 sm:px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => onViewLeave && onViewLeave(leave)}
                    className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer shadow-2xs"
                    title="View full details and manage approval status"
                  >
                    <Eye size={14} />
                    <span>View / Manage</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
