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
import TablePagination from "../../components/TablePagination";
import ApprovalLeaveTable from "../../components/ApprovalLeaveTable";
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
  
  // Operations Vertical (Tab 2) State
  const [opsData, setOpsData] = useState({ teamLeaves: [] });
  const [opsPage, setOpsPage] = useState(1);
  const [opsPageSize, setOpsPageSize] = useState(25);
  const [opsYearFilter, setOpsYearFilter] = useState("all");
  const [opsMonthFilter, setOpsMonthFilter] = useState("all");
  const [opsStatusFilter, setOpsStatusFilter] = useState("all");
  const [opsAvailableYears, setOpsAvailableYears] = useState([new Date().getFullYear()]);
  const [opsTableLoading, setOpsTableLoading] = useState(false);
  const [opsPendingCount, setOpsPendingCount] = useState(0);
  const [opsPagination, setOpsPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Vertical Leads Approvals (Tab 3) State
  const [leadLeaves, setLeadLeaves] = useState([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadPageSize, setLeadPageSize] = useState(25);
  const [leadVerticalFilter, setLeadVerticalFilter] = useState("all");
  const [leadYearFilter, setLeadYearFilter] = useState("all");
  const [leadMonthFilter, setLeadMonthFilter] = useState("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState("all");
  const [leadAvailableYears, setLeadAvailableYears] = useState([new Date().getFullYear()]);
  const [leadTableLoading, setLeadTableLoading] = useState(false);
  const [leadPendingCount, setLeadPendingCount] = useState(0);
  const [leadPagination, setLeadPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });

  // Modal & Retry State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveForDetails, setSelectedLeaveForDetails] = useState(null);
  const [retryingDecisionId, setRetryingDecisionId] = useState(null);
  const [decisionCooldowns, setDecisionCooldowns] = useState({});

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Combined fetch function using Promise.all to prevent loading state flicker
  const fetchAllDashboardData = async () => {
    try {
      setLoading(true);
      const [empRes, opsRes, leadRes] = await Promise.all([
        API.get("/users/all"),
        API.get(`/leave/team-dashboard?vertical=Operations&page=1&limit=${opsPageSize}`),
        API.get(`/leave/lead-requests?page=1&limit=${leadPageSize}`)
      ]);

      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);

      // Set Operations data
      setOpsData(opsRes.data || { teamLeaves: [] });
      if (opsRes.data?.pagination) {
        setOpsPagination(opsRes.data.pagination);
      }
      if (opsRes.data?.availableYears && Array.isArray(opsRes.data.availableYears)) {
        setOpsAvailableYears(opsRes.data.availableYears);
      }
      if (opsRes.data?.stats?.pending !== undefined) {
        setOpsPendingCount(opsRes.data.stats.pending);
      } else {
        setOpsPendingCount((opsRes.data?.teamLeaves || []).filter((l) => l.status === "pending").length);
      }

      // Set Lead data
      const leadLeavesData = leadRes.data?.leadLeaves || (Array.isArray(leadRes.data) ? leadRes.data : []);
      setLeadLeaves(leadLeavesData);
      if (leadRes.data?.pagination) {
        setLeadPagination(leadRes.data.pagination);
      }
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

  // Filtered & Paginated fetch for Operations Vertical Leaves
  const fetchOpsLeaves = async (
    targetPage = opsPage,
    limit = opsPageSize,
    yr = opsYearFilter,
    mo = opsMonthFilter,
    st = opsStatusFilter,
    silent = false
  ) => {
    try {
      if (!silent) setOpsTableLoading(true);
      const params = new URLSearchParams({
        vertical: "Operations",
        page: targetPage.toString(),
        limit: limit.toString()
      });
      if (yr !== "all") params.append("year", yr);
      if (mo !== "all") params.append("month", mo);
      if (st !== "all") params.append("status", st);

      const res = await API.get(`/leave/team-dashboard?${params.toString()}`);

      // Gracefully fall back to previous page if current page became empty after approving/rejecting
      if (res.data?.teamLeaves?.length === 0 && targetPage > 1 && (res.data?.pagination?.total || 0) > 0) {
        return fetchOpsLeaves(targetPage - 1, limit, yr, mo, st, silent);
      }

      setOpsData(res.data || { teamLeaves: [] });
      if (res.data?.pagination) {
        setOpsPagination(res.data.pagination);
      }
      if (res.data?.availableYears && Array.isArray(res.data.availableYears)) {
        setOpsAvailableYears(res.data.availableYears);
      }
      if (res.data?.stats?.pending !== undefined) {
        setOpsPendingCount(res.data.stats.pending);
      }
      setOpsPage(targetPage);
    } catch (err) {
      console.error("Failed to fetch operations leaves:", err);
      toast.error("Failed to load operations leave requests");
    } finally {
      setOpsTableLoading(false);
    }
  };

  const handleOpsPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (opsPagination?.totalPages || 1)) {
      fetchOpsLeaves(newPage, opsPageSize, opsYearFilter, opsMonthFilter, opsStatusFilter);
    }
  };

  const handleOpsPageSizeChange = (newSize) => {
    setOpsPageSize(newSize);
    fetchOpsLeaves(1, newSize, opsYearFilter, opsMonthFilter, opsStatusFilter);
  };

  const handleOpsYearChange = (yr) => {
    setOpsYearFilter(yr);
    fetchOpsLeaves(1, opsPageSize, yr, opsMonthFilter, opsStatusFilter);
  };

  const handleOpsMonthChange = (mo) => {
    setOpsMonthFilter(mo);
    fetchOpsLeaves(1, opsPageSize, opsYearFilter, mo, opsStatusFilter);
  };

  const handleOpsStatusChange = (st) => {
    setOpsStatusFilter(st);
    fetchOpsLeaves(1, opsPageSize, opsYearFilter, opsMonthFilter, st);
  };

  const resetOpsFilters = () => {
    setOpsYearFilter("all");
    setOpsMonthFilter("all");
    setOpsStatusFilter("all");
    fetchOpsLeaves(1, opsPageSize, "all", "all", "all");
  };

  const hasActiveOpsFilters = opsYearFilter !== "all" || opsMonthFilter !== "all" || opsStatusFilter !== "all";

  // Filtered & Paginated fetch for Vertical Lead Requests
  const fetchLeadLeaves = async (
    targetPage = leadPage,
    limit = leadPageSize,
    vert = leadVerticalFilter,
    yr = leadYearFilter,
    mo = leadMonthFilter,
    st = leadStatusFilter,
    silent = false
  ) => {
    try {
      if (!silent) setLeadTableLoading(true);
      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString()
      });
      if (vert !== "all") params.append("vertical", vert);
      if (yr !== "all") params.append("year", yr);
      if (mo !== "all") params.append("month", mo);
      if (st !== "all") params.append("status", st);

      const res = await API.get(`/leave/lead-requests?${params.toString()}`);

      // Gracefully fall back to previous page if current page became empty after approving/rejecting
      if (res.data?.leadLeaves?.length === 0 && targetPage > 1 && (res.data?.pagination?.total || 0) > 0) {
        return fetchLeadLeaves(targetPage - 1, limit, vert, yr, mo, st, silent);
      }

      const leaves = res.data?.leadLeaves || (Array.isArray(res.data) ? res.data : []);
      setLeadLeaves(leaves);
      if (res.data?.pagination) {
        setLeadPagination(res.data.pagination);
      }
      if (res.data?.availableYears && Array.isArray(res.data.availableYears)) {
        setLeadAvailableYears(res.data.availableYears);
      }
      if (res.data?.pendingCount !== undefined) {
        setLeadPendingCount(res.data.pendingCount);
      }
      setLeadPage(targetPage);
    } catch (err) {
      console.error("Failed to fetch lead leaves:", err);
      toast.error("Failed to load vertical lead leave requests");
    } finally {
      setLeadTableLoading(false);
    }
  };

  const handleLeadVerticalChange = (vert) => {
    setLeadVerticalFilter(vert);
    fetchLeadLeaves(1, leadPageSize, vert, leadYearFilter, leadMonthFilter, leadStatusFilter);
  };

  const handleLeadPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (leadPagination?.totalPages || 1)) {
      fetchLeadLeaves(newPage, leadPageSize, leadVerticalFilter, leadYearFilter, leadMonthFilter, leadStatusFilter);
    }
  };

  const handleLeadPageSizeChange = (newSize) => {
    setLeadPageSize(newSize);
    fetchLeadLeaves(1, newSize, leadVerticalFilter, leadYearFilter, leadMonthFilter, leadStatusFilter);
  };

  const handleLeadYearChange = (yr) => {
    setLeadYearFilter(yr);
    fetchLeadLeaves(1, leadPageSize, leadVerticalFilter, yr, leadMonthFilter, leadStatusFilter);
  };

  const handleLeadMonthChange = (mo) => {
    setLeadMonthFilter(mo);
    fetchLeadLeaves(1, leadPageSize, leadVerticalFilter, leadYearFilter, mo, leadStatusFilter);
  };

  const handleLeadStatusChange = (st) => {
    setLeadStatusFilter(st);
    fetchLeadLeaves(1, leadPageSize, leadVerticalFilter, leadYearFilter, leadMonthFilter, st);
  };

  const resetLeadFilters = () => {
    setLeadVerticalFilter("all");
    setLeadYearFilter("all");
    setLeadMonthFilter("all");
    setLeadStatusFilter("all");
    fetchLeadLeaves(1, leadPageSize, "all", "all", "all", "all");
  };

  const hasActiveLeadFilters = leadVerticalFilter !== "all" || leadYearFilter !== "all" || leadMonthFilter !== "all" || leadStatusFilter !== "all";

  const handleLeaveStatusUpdated = async () => {
    await Promise.all([
      fetchLeadLeaves(leadPage, leadPageSize, leadVerticalFilter, leadYearFilter, leadMonthFilter, leadStatusFilter, true),
      fetchOpsLeaves(opsPage, opsPageSize, opsYearFilter, opsMonthFilter, opsStatusFilter, true),
      API.get("/users/all").then((res) => setEmployees(res.data)).catch(() => {})
    ]);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  const displayPendingOpsCount = opsPendingCount || (opsData.teamLeaves || []).filter((l) => l.status === "pending").length;

  return (
    <div className="space-y-5 sm:space-y-6 pb-2">
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
          className="w-full sm:w-auto justify-center flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white font-bold px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-[1.02] transition cursor-pointer text-xs sm:text-sm"
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
          {displayPendingOpsCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
              {displayPendingOpsCount}
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

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm text-left border-collapse table-auto">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sm:text-[11px] font-bold border-b border-slate-100 tracking-wider">
                  <tr>
                    <th className="py-3 px-3 sm:px-4">Employee</th>
                    <th className="py-3 px-2 sm:px-3">Vertical</th>
                    <th className="py-3 px-2 text-center">Casual</th>
                    <th className="py-3 px-2 text-center">Sick</th>
                    <th className="py-3 px-2 text-center">Flexible</th>
                    <th className="py-3 px-2 text-center">Extra</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                        No employees found matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr key={emp._id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4">
                          <div className="font-bold text-slate-900 truncate max-w-[160px] sm:max-w-xs" title={emp.name}>
                            {emp.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal truncate max-w-[160px] sm:max-w-xs" title={emp.email}>
                            {emp.email}
                          </div>
                        </td>
                        <td className="py-2.5 px-2 sm:py-3 sm:px-3 whitespace-nowrap">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-semibold text-primary">
                            {emp.vertical || "None"}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 sm:py-3 text-center text-slate-700 font-semibold">
                          {emp.leaveBalance?.casual?.taken ?? 0}
                        </td>
                        <td className="py-2.5 px-2 sm:py-3 text-center text-slate-700 font-semibold">
                          {emp.leaveBalance?.sick?.taken ?? 0}
                        </td>
                        <td className="py-2.5 px-2 sm:py-3 text-center text-slate-700 font-semibold">
                          {emp.leaveBalance?.flexible?.taken ?? 0}
                        </td>
                        <td className="py-2.5 px-2 sm:py-3 text-center font-bold text-yellow-500">
                          {emp.leaveBalance?.extra?.taken ?? 0}
                        </td>
                        <td className="py-2.5 px-3 sm:py-3 sm:px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => navigate(`/admin/employee/${emp._id}`)}
                            className="bg-primary hover:bg-blue-800 text-white px-3 py-1.5 rounded-xl transition text-xs font-semibold cursor-pointer shadow-2xs"
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
        </div>
      )}

      {/* TAB 2: OPERATIONS VERTICAL */}
      {activeTab === "operations" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-md p-4 sm:p-6 border border-slate-100 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-800">
                  Operations Team Leave Requests
                </h2>
                <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                  {hasActiveOpsFilters 
                    ? `Filtered: ${opsPagination.total} results` 
                    : `${opsPagination.total} Total`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Review and manage leave requests for members in the Operations vertical.
              </p>
            </div>

            <LeaveFilterBar
              yearFilter={opsYearFilter}
              onYearChange={handleOpsYearChange}
              availableYears={opsAvailableYears}
              monthFilter={opsMonthFilter}
              onMonthChange={handleOpsMonthChange}
              statusFilter={opsStatusFilter}
              onStatusChange={handleOpsStatusChange}
              onReset={resetOpsFilters}
              hasActiveFilters={hasActiveOpsFilters}
              showVerticalFilter={false}
            />
          </div>

          <ApprovalLeaveTable
            leaves={opsData.teamLeaves || []}
            loading={opsTableLoading}
            memberColumnLabel="Employee"
            onViewLeave={(leave) => setSelectedLeaveForDetails(leave)}
            onResendEmail={handleResendDecisionEmail}
            retryingId={retryingDecisionId}
            cooldowns={decisionCooldowns}
            emptyMessage={
              hasActiveOpsFilters
                ? "No operations requests match the selected filters."
                : "No leave applications found for operations vertical."
            }
            onResetFilters={hasActiveOpsFilters ? resetOpsFilters : null}
          />

          <TablePagination
            pagination={opsPagination}
            onPageChange={handleOpsPageChange}
            onPageSizeChange={handleOpsPageSizeChange}
            loading={opsTableLoading}
            itemLabel="requests"
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
                    ? `Filtered: ${leadPagination.total} results` 
                    : `${leadPagination.total} Total`}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                Review and approve leave requests submitted by designated Vertical Leads.
              </p>
            </div>

            <LeaveFilterBar
              showVerticalFilter={true}
              verticalFilter={leadVerticalFilter}
              onVerticalChange={handleLeadVerticalChange}
              verticalOptions={["Program", "EdTech", "Placement"]}
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

          <ApprovalLeaveTable
            leaves={leadLeaves}
            loading={leadTableLoading}
            memberColumnLabel="Vertical Lead"
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

          <TablePagination
            pagination={leadPagination}
            onPageChange={handleLeadPageChange}
            onPageSizeChange={handleLeadPageSizeChange}
            loading={leadTableLoading}
            itemLabel="requests"
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
