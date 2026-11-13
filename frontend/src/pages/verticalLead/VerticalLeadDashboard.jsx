import React, { useState, useEffect, useCallback } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import CreateUserModal from "../../components/CreateUserModal";
import LeaveDetailsModal from "../../components/LeaveDetailsModal";
import EmployeeHistoryModal from "../../components/EmployeeHistoryModal";
import LeaveFilterBar from "../../components/LeaveFilterBar";
import TablePagination from "../../components/TablePagination";
import ApprovalLeaveTable from "../../components/ApprovalLeaveTable";
import YearSelect from "../../components/YearSelect";
import { useAuth } from "../../context/AuthContext";
import { 
  UserPlus, 
  RotateCcw, 
  History,
  Calendar
} from "lucide-react";

export default function VerticalLeadDashboard() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState({
    vertical: "",
    totalTeamMembers: 0,
    teamMembers: [],
    teamLeaves: [],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false
    },
    stats: {
      pending: 0,
      approved: 0
    },
    availableYears: [new Date().getFullYear()]
  });

  // Filter states
  const currentISTYear = new Date().getFullYear();
  const [teamBalanceYear, setTeamBalanceYear] = useState(currentISTYear.toString());
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedLeaveForReview, setSelectedLeaveForReview] = useState(null);
  const [selectedEmployeeForHistory, setSelectedEmployeeForHistory] = useState(null);

  // Email retry & cooldown state
  const [retryingEmailId, setRetryingEmailId] = useState(null);
  const [cooldowns, setCooldowns] = useState({});

  // 1-second countdown timer for retry cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        let changed = false;
        const updated = { ...prev };
        Object.keys(updated).forEach((id) => {
          if (updated[id] > 0) {
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
    if (retryingEmailId === leaveId || (cooldowns[leaveId] > 0)) return;

    try {
      setRetryingEmailId(leaveId);
      const res = await API.post(`/leave/resend-decision-email/${leaveId}`);
      toast.success(res.data?.message || "Decision notification email sent to employee! ✅");

      // Update local state immediately
      setDashboardData((prev) => ({
        ...prev,
        teamLeaves: prev.teamLeaves.map((l) =>
          l._id === leaveId
            ? { ...l, decisionEmailStatus: "sent", decisionEmailError: "" }
            : l
        )
      }));

      // Keep selected leave in sync if modal is open
      setSelectedLeaveForReview((prev) =>
        prev && prev._id === leaveId
          ? { ...prev, decisionEmailStatus: "sent", decisionEmailError: "" }
          : prev
      );
    } catch (err) {
      const remainingSeconds = err.response?.data?.remainingSeconds;
      if (err.response?.status === 429 && remainingSeconds) {
        setCooldowns((prev) => ({ ...prev, [leaveId]: remainingSeconds }));
      } else {
        toast.error(err.response?.data?.message || "Failed to dispatch email.");
        setCooldowns((prev) => ({ ...prev, [leaveId]: 5 }));
      }
    } finally {
      setRetryingEmailId(null);
    }
  };

  const fetchDashboardData = useCallback(async (
    targetPage = currentPage,
    limit = pageSize,
    yr = yearFilter,
    mo = monthFilter,
    st = statusFilter,
    isInitial = false,
    silent = false,
    balYr = teamBalanceYear
  ) => {
    try {
      if (isInitial) {
        setLoading(true);
      } else if (!silent) {
        setTableLoading(true);
      }

      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: limit.toString()
      });

      if (yr !== "all") params.append("year", yr);
      if (mo !== "all") params.append("month", mo);
      if (st !== "all") params.append("status", st);
      if (balYr) params.append("balanceYear", balYr);

      const res = await API.get(`/leave/team-dashboard?${params.toString()}`);

      // Gracefully fall back to previous page if current page became empty after approving/rejecting
      if (res.data?.teamLeaves?.length === 0 && targetPage > 1 && (res.data?.pagination?.total || 0) > 0) {
        return fetchDashboardData(targetPage - 1, limit, yr, mo, st, false, silent, balYr);
      }

      setDashboardData((prev) => ({
        ...prev,
        ...res.data,
        pagination: res.data.pagination || prev.pagination,
        stats: res.data.stats || prev.stats,
        availableYears: res.data.availableYears || prev.availableYears
      }));

      setCurrentPage(targetPage);
      setError("");
    } catch (err) {
      console.error("Error fetching lead dashboard:", err);
      setError(err.response?.data?.message || "Failed to load vertical dashboard.");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [currentPage, pageSize, yearFilter, monthFilter, statusFilter, teamBalanceYear]);

  useEffect(() => {
    fetchDashboardData(1, 25, "all", "all", "all", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageSizeChange = (newSize) => {
    const size = parseInt(newSize);
    setPageSize(size);
    fetchDashboardData(1, size, yearFilter, monthFilter, statusFilter, false, false, teamBalanceYear);
  };

  const handleYearChange = (newYear) => {
    setYearFilter(newYear);
    fetchDashboardData(1, pageSize, newYear, monthFilter, statusFilter, false, false, teamBalanceYear);
  };

  const handleMonthChange = (newMonth) => {
    setMonthFilter(newMonth);
    fetchDashboardData(1, pageSize, yearFilter, newMonth, statusFilter, false, false, teamBalanceYear);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    fetchDashboardData(1, pageSize, yearFilter, monthFilter, newStatus, false, false, teamBalanceYear);
  };

  const handleTeamBalanceYearChange = (newYear) => {
    setTeamBalanceYear(newYear);
    fetchDashboardData(currentPage, pageSize, yearFilter, monthFilter, statusFilter, false, false, newYear);
  };

  const resetFilters = () => {
    setYearFilter("all");
    setMonthFilter("all");
    setStatusFilter("all");
    fetchDashboardData(1, pageSize, "all", "all", "all", false, false, teamBalanceYear);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (dashboardData.pagination?.totalPages || 1)) {
      fetchDashboardData(newPage, pageSize, yearFilter, monthFilter, statusFilter, false, false, teamBalanceYear);
    }
  };

  const hasActiveFilters = yearFilter !== "all" || monthFilter !== "all" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center space-y-3">
        <h3 className="font-bold text-lg mb-1">Access Limited</h3>
        <p className="text-sm">{error}</p>
        <button
          onClick={() => fetchDashboardData(1, pageSize, "all", "all", "all", true)}
          className="px-4 py-2 bg-primary hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const pendingCount = dashboardData.stats?.pending ?? 0;
  const approvedCount = dashboardData.stats?.approved ?? 0;
  const pagination = dashboardData.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 sm:pb-5 gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              {dashboardData.vertical} Vertical Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Overview of team leave balance and approval requests.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 sm:gap-2 bg-primary text-white px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-800 transition shadow-sm cursor-pointer"
            >
              <UserPlus size={16} />
              <span>Add Team Member</span>
            </button>

            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 text-xs sm:text-sm font-medium transition cursor-pointer"
            >
              <RotateCcw size={15} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Team Strength
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">
                {dashboardData.totalTeamMembers}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl text-xl">👥</div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Pending Requests
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-amber-600 mt-1">
                {pendingCount}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl text-xl">⏳</div>
          </div>

          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Approved Leaves
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-1">
                {approvedCount}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-xl">✅</div>
          </div>
        </div>

        {/* Section 1: Team Member Leave Balance Breakdown */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                Team Members Leave Balances
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Used vs Total Remaining Balance ({teamBalanceYear})
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <YearSelect
                id="team-balance-year-select"
                value={teamBalanceYear}
                onChange={handleTeamBalanceYearChange}
                availableYears={dashboardData.availableYears}
                variant="pill"
                label="Year:"
              />

              <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full font-semibold">
                {dashboardData.teamMembers.filter((m) => !m.isVerticalLead).length} Members
              </span>
            </div>
          </div>

          {dashboardData.teamMembers.filter((member) => !member.isVerticalLead).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No non-lead team members assigned to this vertical.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {dashboardData.teamMembers
                .filter((member) => !member.isVerticalLead)
                .map((member) => (
                  <div
                    key={member._id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <h4 className="font-bold text-slate-900 text-base truncate" title={member.name}>
                        {member.name}
                      </h4>
                      <p className="text-xs text-slate-400 font-medium truncate" title={member.email}>
                        {member.email}
                      </p>
                    </div>

                    {/* Color-Coded Leave Stats */}
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center text-xs">
                      <div className="bg-blue-50/80 border border-blue-100 p-2 sm:p-2.5 rounded-xl space-y-0.5">
                        <p className="text-primary font-bold text-[10px] sm:text-[11px]">Casual</p>
                        <p className="font-black text-blue-950 text-xs sm:text-sm">
                          {member.leaveBalance?.casual?.taken ?? 0}{" "}
                          <span className="text-slate-400 text-[10px] sm:text-xs font-normal">
                            / {member.leaveBalance?.casual?.total ?? 11}
                          </span>
                        </p>
                      </div>

                      <div className="bg-rose-50/80 border border-rose-100 p-2 sm:p-2.5 rounded-xl space-y-0.5">
                        <p className="text-rose-600 font-bold text-[10px] sm:text-[11px]">Sick</p>
                        <p className="font-black text-rose-950 text-xs sm:text-sm">
                          {member.leaveBalance?.sick?.taken ?? 0}{" "}
                          <span className="text-slate-400 text-[10px] sm:text-xs font-normal">
                            / {member.leaveBalance?.sick?.total ?? 10}
                          </span>
                        </p>
                      </div>

                      <div className="bg-emerald-50/80 border border-emerald-100 p-2 sm:p-2.5 rounded-xl space-y-0.5">
                        <p className="text-emerald-600 font-bold text-[10px] sm:text-[11px]">Flexible</p>
                        <p className="font-black text-emerald-950 text-xs sm:text-sm">
                          {member.leaveBalance?.flexible?.taken ?? 0}{" "}
                          <span className="text-slate-400 text-[10px] sm:text-xs font-normal">
                            / {member.leaveBalance?.flexible?.total ?? 5}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* View History Button */}
                    <button
                      onClick={() => setSelectedEmployeeForHistory(member)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-primary font-semibold rounded-xl text-xs transition border border-slate-200 hover:border-blue-200 cursor-pointer"
                    >
                      <History size={14} />
                      <span>View History</span>
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Section 2: Team Leave Requests with Server-Side Filters & Pagination */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header & Filter Controls Bar */}
          <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4 bg-white">
            <div className="flex items-center gap-3">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">Team Leave Requests</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                {hasActiveFilters 
                  ? `Filtered: ${pagination.total} results` 
                  : `${pagination.total} Total`}
              </span>
            </div>

            {/* Reusable Filter Controls Bar */}
            <LeaveFilterBar
              yearFilter={yearFilter}
              onYearChange={handleYearChange}
              availableYears={dashboardData.availableYears}
              monthFilter={monthFilter}
              onMonthChange={handleMonthChange}
              statusFilter={statusFilter}
              onStatusChange={handleStatusChange}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>

          {/* Leaves Table */}
          <ApprovalLeaveTable
            leaves={dashboardData.teamLeaves}
            loading={tableLoading}
            actionLabel="View"
            memberColumnLabel="Employee"
            onViewLeave={setSelectedLeaveForReview}
            onResendEmail={handleResendDecisionEmail}
            retryingId={retryingEmailId}
            cooldowns={cooldowns}
            emptyMessage={
              hasActiveFilters
                ? "No leave requests match the selected filters."
                : "No leave applications found for this team."
            }
            onResetFilters={hasActiveFilters ? resetFilters : null}
          />

          {/* Server-Side Pagination Bar */}
          <TablePagination
            pagination={pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            loading={tableLoading}
            itemLabel="requests"
            className="px-4 py-3 sm:px-6 sm:py-4 bg-white"
          />
        </div>

      </div>

      {/* Modal for Reviewing Leave Request Details & Approve/Reject */}
      <LeaveDetailsModal
        isOpen={!!selectedLeaveForReview}
        leave={selectedLeaveForReview}
        onClose={() => setSelectedLeaveForReview(null)}
        onStatusUpdated={() => fetchDashboardData(currentPage, pageSize, yearFilter, monthFilter, statusFilter, false, true)}
        onResendDecisionEmail={handleResendDecisionEmail}
        isRetryingDecisionEmail={selectedLeaveForReview ? retryingEmailId === selectedLeaveForReview._id : false}
        decisionEmailCooldownSeconds={selectedLeaveForReview ? (cooldowns[selectedLeaveForReview._id] || 0) : 0}
      />

      {/* Modal for Viewing Employee Leave History */}
      <EmployeeHistoryModal
        isOpen={!!selectedEmployeeForHistory}
        employee={selectedEmployeeForHistory}
        initialYear={teamBalanceYear}
        onClose={() => setSelectedEmployeeForHistory(null)}
      />

      {/* Modal for Creating Team Member */}
      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUser={currentUser}
        onUserCreated={() => fetchDashboardData()}
      />
    </div>
  );
}
