import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import EmployeeLeaveTable from "../../components/EmployeeLeaveTable";
import EmployeeLeaveViewModal from "../../components/EmployeeLeaveViewModal";
import LeaveSummaryConfirmModal from "../../components/LeaveSummaryConfirmModal";
import YearSelect from "../../components/YearSelect";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  PlusCircle,
  FileText,
  Calendar
} from "lucide-react";
import { getNationalHolidays } from "../../constants/leaveConstants";

export default function Dashboard() {
  const navigate = useNavigate();

  const [leaveData, setLeaveData] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Year Selection & Navigation State
  const currentSysYear = new Date().getFullYear();
  const [currentYear, setCurrentYear] = useState(currentSysYear);
  const [selectedYear, setSelectedYear] = useState(currentSysYear);
  const [availableYears, setAvailableYears] = useState([currentSysYear, currentSysYear + 1]);

  // Modal inspection state
  const [selectedLeaveForView, setSelectedLeaveForView] = useState(null);
  const [selectedLeaveForCancel, setSelectedLeaveForCancel] = useState(null);
  const [retryingId, setRetryingId] = useState(null);
  const [retryingCancellationId, setRetryingCancellationId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [cancellationCooldowns, setCancellationCooldowns] = useState({});

  // Countdown timer for email retry cooldowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev };
        let changed = false;
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

      setCancellationCooldowns((prev) => {
        const updated = { ...prev };
        let changed = false;
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

  const fetchDashboardData = async (targetYear = null) => {
    try {
      setLoading(true);

      const activeTargetYear = targetYear !== null ? targetYear : selectedYear;
      const yearQuery = targetYear !== null ? `?year=${targetYear}` : "";
      const leavesYearParam = targetYear !== null ? `&year=${targetYear}` : "";

      // Fetch user profile (balance for targetYear) and latest 5 leaves for targetYear
      const [userResult, leavesResult] = await Promise.allSettled([
        API.get(`/users/me${yearQuery}`),
        API.get(`/leave/myleaves?page=1&limit=5${leavesYearParam}`)
      ]);

      let resolvedYear = activeTargetYear;

      // 1. Process User Profile & Leave Balances
      if (userResult.status === "fulfilled") {
        const userData = userResult.value.data;
        setCurrentUser(userData);

        const sysYear = userData?.currentYear || new Date().getFullYear();
        setCurrentYear(sysYear);

        if (userData?.availableYears && Array.isArray(userData.availableYears)) {
          const yearsSet = new Set(userData.availableYears);
          yearsSet.add(sysYear);
          yearsSet.add(sysYear + 1);
          setAvailableYears(Array.from(yearsSet).sort((a, b) => b - a));
        }

        if (userData?.selectedYear) {
          resolvedYear = userData.selectedYear;
          setSelectedYear(userData.selectedYear);
        } else if (targetYear === null) {
          resolvedYear = sysYear;
          setSelectedYear(sysYear);
        }

        const balance = userData?.leaveBalance;
        const today = new Date();
        const holidaysForYear = getNationalHolidays(resolvedYear);

        let completedNationalHolidays = 0;
        const activeSysYear = userData?.currentYear || new Date().getFullYear();
        if (resolvedYear < activeSysYear) {
          completedNationalHolidays = 4;
        } else if (resolvedYear > activeSysYear) {
          completedNationalHolidays = 0;
        } else {
          completedNationalHolidays = holidaysForYear.filter((h) => h.date <= today).length;
        }

        const cards = [
          {
            title: "Casual Leave",
            total: balance?.casual?.total ?? 11,
            taken: balance?.casual?.taken ?? 0,
          },
          {
            title: "Sick Leave",
            total: balance?.sick?.total ?? 10,
            taken: balance?.sick?.taken ?? 0,
          },
          {
            title: "Flexible Cultural Leave",
            total: balance?.flexible?.total ?? 5,
            taken: balance?.flexible?.taken ?? 0,
          },
          {
            title: "National Holidays",
            total: 4,
            taken: completedNationalHolidays,
          },
          {
            title: "Extra Leaves",
            total: null,
            taken: balance?.extra?.taken ?? 0,
            isCounterOnly: true,
            badgeText: "Extra Leave"
          }
        ];

        setLeaveData(cards);
      }

      // 2. Process Recent Leaves & Pending Count
      if (leavesResult.status === "fulfilled") {
        const leavesRes = leavesResult.value;
        const leavesData = leavesRes.data?.leaves || (Array.isArray(leavesRes.data) ? leavesRes.data : []);
        setRecentLeaves(leavesData.slice(0, 5));
        
        // pendingCount from backend response, or calculate as fallback
        const computedPending = leavesRes.data?.pendingCount !== undefined
          ? leavesRes.data.pendingCount
          : leavesData.filter((l) => l.status === "pending").length;
        setPendingCount(computedPending);

        // Initialize any active 5s cooldowns based on lastEmailAttemptAt and lastCancellationEmailAttemptAt
        const now = Date.now();
        const updatedCooldowns = {};
        const updatedCancellationCooldowns = {};
        leavesData.forEach((item) => {
          if (item.emailStatus === "failed" && item.lastEmailAttemptAt) {
            const elapsed = Math.floor((now - new Date(item.lastEmailAttemptAt).getTime()) / 1000);
            if (elapsed < 5) {
              updatedCooldowns[item._id] = 5 - elapsed;
            }
          }
          if (item.cancellationEmailStatus === "failed" && item.lastCancellationEmailAttemptAt) {
            const elapsed = Math.floor((now - new Date(item.lastCancellationEmailAttemptAt).getTime()) / 1000);
            if (elapsed < 5) {
              updatedCancellationCooldowns[item._id] = 5 - elapsed;
            }
          }
        });
        if (Object.keys(updatedCooldowns).length > 0) {
          setCooldowns((prev) => ({ ...prev, ...updatedCooldowns }));
        }
        if (Object.keys(updatedCancellationCooldowns).length > 0) {
          setCancellationCooldowns((prev) => ({ ...prev, ...updatedCancellationCooldowns }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleYearChange = (newYear) => {
    setSelectedYear(newYear);
    fetchDashboardData(newYear);
  };

  // Handle email retry if modal or table is used to retry a failed leave email
  const handleResend = async (leaveId) => {
    if (retryingId === leaveId || (cooldowns[leaveId] > 0)) return;

    try {
      setRetryingId(leaveId);
      const res = await API.post(`/leave/resend-email/${leaveId}`);
      toast.success(res.data?.message || "Notification email dispatched successfully!");

      setRecentLeaves((prev) =>
        prev.map((item) =>
          item._id === leaveId ? { ...item, emailStatus: "sent", emailError: "" } : item
        )
      );

      if (selectedLeaveForView && selectedLeaveForView._id === leaveId) {
        setSelectedLeaveForView((prev) => ({
          ...prev,
          emailStatus: "sent",
          emailError: "",
        }));
      }
    } catch (err) {
      const remainingSeconds = err.response?.data?.remainingSeconds;
      if (err.response?.status === 429 && remainingSeconds) {
        setCooldowns((prev) => ({ ...prev, [leaveId]: remainingSeconds }));
      } else {
        toast.error(err.response?.data?.message || "Failed to dispatch email.");
        setCooldowns((prev) => ({ ...prev, [leaveId]: 5 }));
      }
    } finally {
      setRetryingId(null);
    }
  };

  // Handle retry cancellation email dispatch
  const handleResendCancellation = async (leaveId) => {
    if (retryingCancellationId === leaveId || (cancellationCooldowns[leaveId] > 0)) return;

    try {
      setRetryingCancellationId(leaveId);
      const res = await API.post(`/leave/resend-cancellation-email/${leaveId}`);
      toast.success(res.data?.message || "Cancellation notification email dispatched successfully!");

      setRecentLeaves((prev) =>
        prev.map((item) =>
          item._id === leaveId
            ? { ...item, cancellationEmailStatus: "sent", cancellationEmailError: "" }
            : item
        )
      );

      if (selectedLeaveForView && selectedLeaveForView._id === leaveId) {
        setSelectedLeaveForView((prev) => ({
          ...prev,
          cancellationEmailStatus: "sent",
          cancellationEmailError: "",
        }));
      }
    } catch (err) {
      const remainingSeconds = err.response?.data?.remainingSeconds;
      if (err.response?.status === 429 && remainingSeconds) {
        setCancellationCooldowns((prev) => ({ ...prev, [leaveId]: remainingSeconds }));
      } else {
        toast.error(err.response?.data?.message || "Failed to dispatch cancellation email.");
        setCancellationCooldowns((prev) => ({ ...prev, [leaveId]: 5 }));
      }
    } finally {
      setRetryingCancellationId(null);
    }
  };

  // Open confirmation modal for leave cancellation (closes view modal to prevent stacking)
  const handleCancelLeave = (leave) => {
    if (!leave || leave.status !== "pending") return;
    setSelectedLeaveForView(null);
    setSelectedLeaveForCancel(leave);
  };

  // Perform confirmed cancellation
  const handleConfirmCancellation = async () => {
    if (!selectedLeaveForCancel) return;
    const leave = selectedLeaveForCancel;

    try {
      setCancellingId(leave._id);
      const res = await API.put(`/leave/cancel/${leave._id}`);
      const updatedLeave = res.data?.leave || {};
      toast.success(res.data?.message || "Leave request cancelled successfully!");
      setSelectedLeaveForCancel(null);

      // Update recent leaves list with cancellation status and email status
      setRecentLeaves((prev) =>
        prev.map((item) =>
          item._id === leave._id
            ? {
                ...item,
                status: "cancelled",
                cancelledAt: updatedLeave.cancelledAt || new Date(),
                cancellationEmailStatus: updatedLeave.cancellationEmailStatus || (res.data?.emailSent ? "sent" : "failed"),
                cancellationEmailError: updatedLeave.cancellationEmailError || ""
              }
            : item
        )
      );

      // Decrement pending count
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error cancelling leave:", err);
      toast.error(err.response?.data?.message || "Failed to cancel leave request.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn p-1 sm:p-2">
      {/* Header with Title and Quick Apply Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 border-b border-slate-100 pb-4 sm:pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-xs sm:text-sm md:text-base">
            Track your leave balance, pending approvals, and recent leave history at a glance.
          </p>
        </div>
      </div>

      {/* Pending Approvals Summary Banner */}
      {loading ? (
        <div className="rounded-2xl p-4 sm:p-5 border border-slate-200 bg-slate-50/70 animate-pulse">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-32 sm:w-40 bg-slate-200 rounded" />
              <div className="h-3 w-48 sm:w-64 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-2xl p-4 sm:p-5 border shadow-2xs transition-all duration-300 ${
            pendingCount > 0
              ? "bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/80 border-amber-200"
              : "bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/70 border-emerald-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border mt-0.5 sm:mt-0 ${
                  pendingCount > 0
                    ? "bg-amber-100 text-amber-700 border-amber-300 shadow-2xs"
                    : "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs"
                }`}
              >
                {pendingCount > 0 ? (
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base md:text-lg">
                    Pending for Approval
                  </h3>
                  <span
                    className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold tracking-wide border ${
                      pendingCount > 0
                        ? "bg-amber-200/80 text-amber-900 border-amber-300"
                        : "bg-emerald-200/80 text-emerald-900 border-emerald-300"
                    }`}
                  >
                    {pendingCount} {pendingCount === 1 ? "Request" : "Requests"}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {pendingCount > 0
                    ? `You have ${pendingCount} leave request${
                        pendingCount === 1 ? "" : "s"
                      } awaiting approval from ${
                        currentUser?.isVerticalLead ? "Admin." : "your Vertical Lead."
                      }`
                    : "All caught up! You have no leave applications pending for approval."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto shrink-0">
              <button
                onClick={() => navigate("/employee/history")}
                className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                  pendingCount > 0
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                }`}
              >
                <span>{pendingCount > 0 ? "View Pending" : "View All History"}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balances Grid */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Leave Quota & Balances</h2>
              {selectedYear < currentYear && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Past Year Archive ({selectedYear})
                </span>
              )}
              {selectedYear > currentYear && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  Upcoming Year Advance ({selectedYear})
                </span>
              )}
              {selectedYear === currentYear && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Current Year ({selectedYear})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of remaining days across each category for {selectedYear}
            </p>
          </div>

          {/* Year Selector Dropdown */}
          <YearSelect
            id="dashboard-year-select"
            value={selectedYear}
            onChange={(val) => handleYearChange(parseInt(val, 10))}
            availableYears={availableYears}
            label="Year:"
            className="self-start sm:self-auto shrink-0 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs"
          />
        </div>

        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 ${leaveData.length > 4 ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-4 sm:gap-6`}>
          {leaveData.map((leave, index) => (
            <LeaveCard key={index} {...leave} />
          ))}
        </div>
      </div>

      {/* Latest 5 Leave Applications Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-800 tracking-tight">
                Recent Leave Applications
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Showing your latest 5 applied leaves.
            </p>
          </div>

          {/* View More Button Redirecting to History */}
          <button
            onClick={() => navigate("/employee/history")}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-2xs group border border-indigo-100 self-start sm:self-auto shrink-0"
          >
            <span>View More</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Reusable Employee Leave Table */}
        <EmployeeLeaveTable
          leaves={recentLeaves}
          loading={loading}
          loadingText="Loading recent leaves..."
          onViewLeave={setSelectedLeaveForView}
          onCancelLeave={handleCancelLeave}
          cancellingId={cancellingId}
          showEmailStatus={true}
          retryingId={retryingId}
          cooldowns={cooldowns}
          onResendEmail={handleResend}
          onResendCancellation={handleResendCancellation}
          retryingCancellationId={retryingCancellationId}
          cancellationCooldowns={cancellationCooldowns}
          emptyMessage="No leave applications yet"
          emptyAction={
            <div className="mt-3">
              <p className="text-xs text-slate-500 mb-3">
                You haven't submitted any leave requests yet. When you apply, your latest 5 leaves will appear here.
              </p>
              <button
                onClick={() => navigate("/employee/apply")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer"
              >
                <PlusCircle size={15} />
                <span>Apply for your first leave</span>
              </button>
            </div>
          }
          footer={
            !loading && recentLeaves.length > 0 && (
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
                <span>
                  Showing <span className="font-bold text-slate-700">{recentLeaves.length}</span> most recent leave requests.
                </span>
                <button
                  onClick={() => navigate("/employee/history")}
                  className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-bold transition cursor-pointer self-start sm:self-auto"
                >
                  <span>Go to full leave history page</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )
          }
        />
      </div>

      {/* Leave Details Modal */}
      {selectedLeaveForView && (
        <EmployeeLeaveViewModal
          isOpen={!!selectedLeaveForView}
          onClose={() => setSelectedLeaveForView(null)}
          leave={selectedLeaveForView}
          onResend={handleResend}
          isRetrying={retryingId === selectedLeaveForView._id}
          cooldownSeconds={cooldowns[selectedLeaveForView._id] || 0}
          onCancelLeave={handleCancelLeave}
          isCancelling={cancellingId === selectedLeaveForView._id}
          onResendCancellation={handleResendCancellation}
          isRetryingCancellation={retryingCancellationId === selectedLeaveForView._id}
          cancellationCooldownSeconds={selectedLeaveForView ? (cancellationCooldowns[selectedLeaveForView._id] || 0) : 0}
        />
      )}

      {/* Branded Leave Cancellation Confirmation Modal */}
      <LeaveSummaryConfirmModal
        isOpen={!!selectedLeaveForCancel}
        onClose={() => setSelectedLeaveForCancel(null)}
        onConfirm={handleConfirmCancellation}
        isSubmitting={cancellingId === selectedLeaveForCancel?._id}
        mode="cancel"
        leaveData={selectedLeaveForCancel ? {
          type: selectedLeaveForCancel.type,
          from: selectedLeaveForCancel.from,
          to: selectedLeaveForCancel.to,
          days: selectedLeaveForCancel.days,
          reason: selectedLeaveForCancel.reason,
          isPastLeave: selectedLeaveForCancel.isPastLeave
        } : null}
      />
    </div>
  );
}
