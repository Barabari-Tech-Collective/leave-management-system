import React, { useState, useEffect, useCallback } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import CreateUserModal from "../../components/CreateUserModal";
import LeaveDetailsModal from "../../components/LeaveDetailsModal";
import EmployeeHistoryModal from "../../components/EmployeeHistoryModal";
import EmailRetryButton from "../../components/EmailRetryButton";
import { useAuth } from "../../context/AuthContext";
import { 
  UserPlus, 
  RotateCcw, 
  Calendar, 
  Eye, 
  History, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Ban
} from "lucide-react";

const MONTHS = [
  { value: "all", label: "All Months" },
  { value: "0", label: "January" },
  { value: "1", label: "February" },
  { value: "2", label: "March" },
  { value: "3", label: "April" },
  { value: "4", label: "May" },
  { value: "5", label: "June" },
  { value: "6", label: "July" },
  { value: "7", label: "August" },
  { value: "8", label: "September" },
  { value: "9", label: "October" },
  { value: "10", label: "November" },
  { value: "11", label: "December" },
];

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
    silent = false
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

      const res = await API.get(`/leave/team-dashboard?${params.toString()}`);

      // Gracefully fall back to previous page if current page became empty after approving/rejecting
      if (res.data?.teamLeaves?.length === 0 && targetPage > 1 && (res.data?.pagination?.total || 0) > 0) {
        return fetchDashboardData(targetPage - 1, limit, yr, mo, st, false, silent);
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
  }, [currentPage, pageSize, yearFilter, monthFilter, statusFilter]);

  useEffect(() => {
    fetchDashboardData(1, 25, "all", "all", "all", true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePageSizeChange = (newSize) => {
    const size = parseInt(newSize);
    setPageSize(size);
    fetchDashboardData(1, size, yearFilter, monthFilter, statusFilter);
  };

  const handleYearChange = (newYear) => {
    setYearFilter(newYear);
    fetchDashboardData(1, pageSize, newYear, monthFilter, statusFilter);
  };

  const handleMonthChange = (newMonth) => {
    setMonthFilter(newMonth);
    fetchDashboardData(1, pageSize, yearFilter, newMonth, statusFilter);
  };

  const handleStatusChange = (newStatus) => {
    setStatusFilter(newStatus);
    fetchDashboardData(1, pageSize, yearFilter, monthFilter, newStatus);
  };

  const resetFilters = () => {
    setYearFilter("all");
    setMonthFilter("all");
    setStatusFilter("all");
    fetchDashboardData(1, pageSize, "all", "all", "all");
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (dashboardData.pagination?.totalPages || 1)) {
      fetchDashboardData(newPage, pageSize, yearFilter, monthFilter, statusFilter);
    }
  };

  const hasActiveFilters = yearFilter !== "all" || monthFilter !== "all" || statusFilter !== "all";

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
        <h3 className="font-bold text-lg mb-2">Access Limited</h3>
        <p>{error}</p>
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
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dashboardData.vertical} Vertical Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Overview of team leave balance and approval requests.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm cursor-pointer"
            >
              <UserPlus size={16} />
              Add Team Member
            </button>

            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition cursor-pointer"
            >
              <RotateCcw size={15} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Team Strength
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardData.totalTeamMembers}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg text-xl">👥</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Pending Requests
              </p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">
                {pendingCount}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg text-xl">⏳</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Approved Leaves
              </p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">
                {approvedCount}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg text-xl">✅</div>
          </div>
        </div>

        {/* Section 1: Team Member Leave Balance Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Team Members Leave Balances
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Used vs Total Remaining Balance
              </p>
            </div>
            <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold">
              {dashboardData.teamMembers.filter((m) => !m.isVerticalLead).length} Members
            </span>
          </div>

          {dashboardData.teamMembers.filter((member) => !member.isVerticalLead).length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No non-lead team members assigned to this vertical.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {dashboardData.teamMembers
                .filter((member) => !member.isVerticalLead)
                .map((member) => (
                  <div
                    key={member._id}
                    className="p-5 rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
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
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-indigo-50/80 border border-indigo-100 p-2.5 rounded-xl space-y-0.5">
                        <p className="text-indigo-600 font-bold text-[11px]">Casual</p>
                        <p className="font-black text-indigo-950 text-sm">
                          {member.leaveBalance?.casual?.taken ?? 0}{" "}
                          <span className="text-slate-400 text-xs font-normal">
                            / {member.leaveBalance?.casual?.total ?? 11}
                          </span>
                        </p>
                      </div>

                      <div className="bg-rose-50/80 border border-rose-100 p-2.5 rounded-xl space-y-0.5">
                        <p className="text-rose-600 font-bold text-[11px]">Sick</p>
                        <p className="font-black text-rose-950 text-sm">
                          {member.leaveBalance?.sick?.taken ?? 0}{" "}
                          <span className="text-slate-400 text-xs font-normal">
                            / {member.leaveBalance?.sick?.total ?? 10}
                          </span>
                        </p>
                      </div>

                      <div className="bg-emerald-50/80 border border-emerald-100 p-2.5 rounded-xl space-y-0.5">
                        <p className="text-emerald-600 font-bold text-[11px]">Flexible</p>
                        <p className="font-black text-emerald-950 text-sm">
                          {member.leaveBalance?.flexible?.taken ?? 0}{" "}
                          <span className="text-slate-400 text-xs font-normal">
                            / {member.leaveBalance?.flexible?.total ?? 5}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* View History Button */}
                    <button
                      onClick={() => setSelectedEmployeeForHistory(member)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-semibold rounded-xl text-xs transition border border-slate-200 hover:border-indigo-200 cursor-pointer"
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Header & Filter Controls Bar */}
          <div className="px-6 py-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-gray-800">Team Leave Requests</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
                {hasActiveFilters 
                  ? `Filtered: ${pagination.total} results` 
                  : `${pagination.total} Total`}
              </span>
            </div>

            {/* 3 Select Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Year Filter */}
              <div className="flex items-center">
                <select
                  value={yearFilter}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {(dashboardData.availableYears || [new Date().getFullYear()]).map((yr) => (
                    <option key={yr} value={yr.toString()}>{yr}</option>
                  ))}
                </select>
              </div>

              {/* Month Filter */}
              <div className="flex items-center">
                <select
                  value={monthFilter}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="flex items-center">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Reset Filters */}
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                  title="Clear all filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>

          {/* Leaves Table */}
          {tableLoading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-xs font-medium">Loading requests...</p>
            </div>
          ) : dashboardData.teamLeaves.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              {hasActiveFilters ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-600">No leave requests match the selected filters.</p>
                  <button
                    onClick={resetFilters}
                    className="text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                  >
                    Reset filters to view all
                  </button>
                </div>
              ) : (
                <p className="text-sm">No leave applications found for this team.</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Type</th>
                    <th className="py-3.5 px-6">Dates</th>
                    <th className="py-3.5 px-6">Days</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6">Email</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {dashboardData.teamLeaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {leave.user?.name || "Unknown"}
                        <div className="text-xs text-gray-400 font-normal">{leave.user?.email}</div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="capitalize font-semibold text-gray-700">{leave.type}</span>
                          {leave.isPastLeave && (
                            <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Past Leave
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                        {new Date(leave.fromDate).toLocaleDateString("en-GB")} -{" "}
                        {new Date(leave.toDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-800">
                        {leave.days} {leave.days === 1 ? "day" : "days"}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            leave.status === "approved" || leave.status === "success"
                              ? "bg-green-100 text-green-800 border border-green-300"
                              : leave.status === "rejected"
                              ? "bg-red-100 text-red-800 border border-red-300"
                              : leave.status === "cancelled"
                              ? "bg-slate-100 text-slate-700 border border-slate-300"
                              : "bg-yellow-100 text-yellow-800 border border-yellow-300"
                          }`}
                        >
                          {(leave.status === "approved" || leave.status === "success") && <CheckCircle2 size={12} className="text-green-700" />}
                          {leave.status === "rejected" && <XCircle size={12} className="text-red-700" />}
                          {leave.status === "cancelled" && <Ban size={12} className="text-slate-500" />}
                          {leave.status === "pending" && <Clock size={12} className="text-yellow-700" />}
                          {leave.status === "success" ? "Success" : leave.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {leave.status === "pending" ? (
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
                            <EmailRetryButton
                              onRetry={() => handleResendDecisionEmail(leave._id)}
                              isRetrying={retryingEmailId === leave._id}
                              cooldownSeconds={cooldowns[leave._id] || 0}
                              size="xs"
                            />
                          </div>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            title="Notification email sent to employee"
                          >
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            Sent
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLeaveForReview(leave)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer shadow-2xs"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Server-Side Pagination Bar with Rows Per Page & Navigation Arrows */}
          {!tableLoading && pagination.total > 0 && (
            <div className="px-6 py-4 border-t border-gray-100 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left Side: Rows per page selector & Total count */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-600">Rows per page:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                  >
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>

                <span className="text-gray-300">|</span>

                <span>
                  Showing <span className="font-bold text-gray-800">{(currentPage - 1) * pagination.limit + 1}</span> to{" "}
                  <span className="font-bold text-gray-800">
                    {Math.min(currentPage * pagination.limit, pagination.total)}
                  </span>{" "}
                  of <span className="font-bold text-gray-800">{pagination.total}</span> requests
                </span>
              </div>

              {/* Right Side: Arrow Navigation & Page Numbers */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!pagination.hasPrevPage || tableLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  title="Previous page"
                >
                  <ChevronLeft size={15} />
                  <span>Previous</span>
                </button>

                {/* Page Number Buttons */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === pagination.totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, index, array) => {
                      const showEllipsis = index > 0 && p - array[index - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-1 text-xs text-gray-400">...</span>}
                          <button
                            onClick={() => handlePageChange(p)}
                            disabled={tableLoading}
                            className={`w-7 h-7 rounded-xl text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                              currentPage === p
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!pagination.hasNextPage || tableLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-2xs"
                  title="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
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
