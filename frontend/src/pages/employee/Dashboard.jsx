import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import EmployeeLeaveTable from "../../components/EmployeeLeaveTable";
import EmployeeLeaveViewModal from "../../components/EmployeeLeaveViewModal";
import LeaveSummaryConfirmModal from "../../components/LeaveSummaryConfirmModal";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { 
  Clock, 
  CheckCircle2, 
  ArrowRight, 
  PlusCircle,
  FileText
} from "lucide-react";

// Fixed National Holidays Schedule
const NATIONAL_HOLIDAYS_2026 = [
  { name: "Republic Day", date: new Date("2026-01-26") },
  { name: "Labour Day", date: new Date("2026-05-01") },
  { name: "Independence Day", date: new Date("2026-08-15") },
  { name: "Gandhi Jayanti", date: new Date("2026-10-02") },
];

export default function Dashboard() {
  const navigate = useNavigate();

  const [leaveData, setLeaveData] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

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

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch user profile (balance) and latest 5 leaves (with pending count) in parallel with allSettled
        const [userResult, leavesResult] = await Promise.allSettled([
          API.get("/users/me"),
          API.get("/leave/myleaves?page=1&limit=5")
        ]);

        // 1. Process User Profile & Leave Balances
        if (userResult.status === "fulfilled") {
          const userData = userResult.value.data;
          setCurrentUser(userData);
          const balance = userData?.leaveBalance;
          const today = new Date();
          const completedNationalHolidays = NATIONAL_HOLIDAYS_2026.filter(
            (h) => h.date <= today
          ).length;

          setLeaveData([
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
              title: "Flexible Cultural",
              total: balance?.flexible?.total ?? 5,
              taken: balance?.flexible?.taken ?? 0,
            },
            {
              title: "National Holidays",
              total: 4,
              taken: completedNationalHolidays,
            },
          ]);
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

    fetchDashboardData();
  }, []);

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
    <div className="space-y-8 animate-fadeIn p-2">
      {/* Header with Title and Quick Apply Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-1 font-medium text-sm sm:text-base">
            Track your leave balance, pending approvals, and recent leave history at a glance.
          </p>
        </div>

        {/* <button
          onClick={() => navigate("/employee/apply")}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-semibold text-sm rounded-xl shadow-sm transition hover:shadow cursor-pointer self-start sm:self-auto shrink-0"
        >
          <PlusCircle size={17} />
          <span>Apply for Leave</span>
        </button> */}
      </div>

      {/* Pending Approvals Summary Banner */}
      {loading ? (
        <div className="rounded-2xl p-5 border border-slate-200 bg-slate-50/70 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-40 bg-slate-200 rounded" />
              <div className="h-3 w-64 bg-slate-200 rounded" />
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-2xl p-5 border shadow-2xs transition-all duration-300 ${
            pendingCount > 0
              ? "bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/80 border-amber-200"
              : "bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-emerald-50/70 border-emerald-200"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  pendingCount > 0
                    ? "bg-amber-100 text-amber-700 border-amber-300 shadow-2xs"
                    : "bg-emerald-100 text-emerald-700 border-emerald-300 shadow-2xs"
                }`}
              >
                {pendingCount > 0 ? (
                  <Clock className="w-6 h-6 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-bold text-slate-800 text-base sm:text-lg">
                    Pending for Approval
                  </h3>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold tracking-wide border ${
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

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button
                onClick={() => navigate("/employee/history")}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs ${
                  pendingCount > 0
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200"
                }`}
              >
                <span>{pendingCount > 0 ? "View Pending in History" : "View All History"}</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Balances Grid */}
      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Leave Quota & Balances</h2>
          <p className="text-xs text-slate-500">Overview of remaining days across each category for 2026</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
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
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-2xs group border border-indigo-100"
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
