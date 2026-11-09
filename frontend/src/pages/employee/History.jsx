import EmployeeLeaveTable from "../../components/EmployeeLeaveTable";
import EmployeeLeaveViewModal from "../../components/EmployeeLeaveViewModal";
import LeaveSummaryConfirmModal from "../../components/LeaveSummaryConfirmModal";
import LeaveFilterBar from "../../components/LeaveFilterBar";
import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function History() {
  const [historyData, setHistoryData] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalLeaves, setTotalLeaves] = useState(0);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retryingId, setRetryingId] = useState(null);
  const [retryingCancellationId, setRetryingCancellationId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const [cancellationCooldowns, setCancellationCooldowns] = useState({});
  const [selectedLeaveForView, setSelectedLeaveForView] = useState(null);
  const [selectedLeaveForCancel, setSelectedLeaveForCancel] = useState(null);
  const pollAttemptsRef = useRef(0);

  // Filter states
  const [yearFilter, setYearFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);

  const hasActiveFilters = yearFilter !== "all" || monthFilter !== "all" || statusFilter !== "all";

  const fetchHistory = useCallback(async (
    targetPage = 1,
    append = false,
    yr = yearFilter,
    mo = monthFilter,
    st = statusFilter
  ) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingInitial(true);
      }

      const params = new URLSearchParams({
        page: targetPage.toString(),
        limit: "10"
      });
      if (yr !== "all") params.append("year", yr);
      if (mo !== "all") params.append("month", mo);
      if (st !== "all") params.append("status", st);

      const res = await API.get(`/leave/myleaves?${params.toString()}`);
      const items = res.data.leaves || (Array.isArray(res.data) ? res.data : []);
      const pagination = res.data.pagination;

      if (append) {
        setHistoryData((prev) => [...prev, ...items]);
      } else {
        setHistoryData(items);
      }

      if (res.data?.availableYears && Array.isArray(res.data.availableYears)) {
        setAvailableYears(res.data.availableYears);
      }

      if (pagination) {
        setHasMore(pagination.hasMore);
        setTotalLeaves(pagination.total);
        setPage(pagination.page);
      } else {
        setHasMore(false);
        setTotalLeaves(items.length);
      }

      // Initialize any active 5s cooldowns based on lastEmailAttemptAt and lastCancellationEmailAttemptAt
      const now = Date.now();
      const updatedCooldowns = {};
      const updatedCancellationCooldowns = {};
      items.forEach((item) => {
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
    } catch (err) {
      console.error("Failed to fetch leave history:", err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, [yearFilter, monthFilter, statusFilter]);

  useEffect(() => {
    fetchHistory(1, false, "all", "all", "all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleYearChange = (yr) => {
    setYearFilter(yr);
    fetchHistory(1, false, yr, monthFilter, statusFilter);
  };

  const handleMonthChange = (mo) => {
    setMonthFilter(mo);
    fetchHistory(1, false, yearFilter, mo, statusFilter);
  };

  const handleStatusChange = (st) => {
    setStatusFilter(st);
    fetchHistory(1, false, yearFilter, monthFilter, st);
  };

  const resetFilters = () => {
    setYearFilter("all");
    setMonthFilter("all");
    setStatusFilter("all");
    fetchHistory(1, false, "all", "all", "all");
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHistory(page + 1, true, yearFilter, monthFilter, statusFilter);
    }
  };

  // Max 2 polling attempts for any new leave in 'pending' emailStatus to strictly prevent infinite loops
  useEffect(() => {
    const hasPendingEmail = historyData.some((item) => item.emailStatus === "pending");

    if (!hasPendingEmail) {
      pollAttemptsRef.current = 0;
      return;
    }

    if (pollAttemptsRef.current >= 2) {
      return;
    }

    const timer = setTimeout(async () => {
      pollAttemptsRef.current += 1;
      // Fetch currently displayed count to avoid clobbering loaded pages
      const currentCount = historyData.length || 10;
      try {
        const params = new URLSearchParams({
          page: "1",
          limit: currentCount.toString()
        });
        if (yearFilter !== "all") params.append("year", yearFilter);
        if (monthFilter !== "all") params.append("month", monthFilter);
        if (statusFilter !== "all") params.append("status", statusFilter);

        const res = await API.get(`/leave/myleaves?${params.toString()}`);
        const items = res.data.leaves || (Array.isArray(res.data) ? res.data : []);
        setHistoryData(items);
        if (res.data?.pagination) {
          setTotalLeaves(res.data.pagination.total);
          setHasMore(items.length < res.data.pagination.total);
        }
      } catch (pollErr) {
        console.error("Polling error:", pollErr);
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [historyData, yearFilter, monthFilter, statusFilter]);

  // Tick active 5s countdown timers for email retry buttons
  useEffect(() => {
    const timer = setInterval(() => {
      setCooldowns((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (next[id] > 1) {
            next[id] -= 1;
            changed = true;
          } else {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setCancellationCooldowns((prev) => {
        let changed = false;
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (next[id] > 1) {
            next[id] -= 1;
            changed = true;
          } else {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Handle retry email dispatch
  const handleResend = async (leaveId) => {
    const leave = historyData.find((item) => item._id === leaveId);
    if (!leave || leave.emailStatus !== "failed") {
      return;
    }

    if (cooldowns[leaveId] > 0) {
      toast.error(`Please wait ${cooldowns[leaveId]} second(s) before retrying.`);
      return;
    }

    try {
      setRetryingId(leaveId);
      const res = await API.post(`/leave/resend-email/${leaveId}`);
      toast.success(res.data?.message || "Notification email dispatched successfully!");

      // Update local state directly so the retry button instantly disables/disappears
      setHistoryData((prev) =>
        prev.map((item) =>
          item._id === leaveId
            ? { ...item, emailStatus: "sent", emailError: "" }
            : item
        )
      );

      // Keep open modal in sync
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

      setHistoryData((prev) =>
        prev.map((item) =>
          item._id === leaveId
            ? { ...item, cancellationEmailStatus: "sent", cancellationEmailError: "" }
            : item
        )
      );

      setSelectedLeaveForView((prev) =>
        prev && prev._id === leaveId
          ? { ...prev, cancellationEmailStatus: "sent", cancellationEmailError: "" }
          : prev
      );
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

      // Update state locally with cancellation and email status
      setHistoryData((prev) =>
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
    } catch (err) {
      console.error("Error cancelling leave:", err);
      toast.error(err.response?.data?.message || "Failed to cancel leave request.");
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Filter Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
              Leave History
            </h1>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              {hasActiveFilters 
                ? `Filtered: ${totalLeaves} results` 
                : `${totalLeaves} Total`}
            </span>
          </div>
          <p className="text-slate-500 mt-2 font-medium text-xs sm:text-sm">
            Review your past and upcoming leave requests.
          </p>
        </div>

        {/* Reusable Filter Controls Bar */}
        <LeaveFilterBar
          yearFilter={yearFilter}
          onYearChange={handleYearChange}
          availableYears={availableYears}
          monthFilter={monthFilter}
          onMonthChange={handleMonthChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Reusable Employee Leave Table */}
      <EmployeeLeaveTable
        leaves={historyData}
        loading={loadingInitial}
        loadingText="Loading leave history..."
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
        emptyMessage={
          hasActiveFilters
            ? "No leave requests match the selected filters."
            : "No leave requests found."
        }
        emptyAction={
          hasActiveFilters ? (
            <button
              onClick={resetFilters}
              className="mt-2 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              Reset filters to view all
            </button>
          ) : null
        }
        footer={
          !loadingInitial && historyData.length > 0 && (
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{historyData.length}</span> of{" "}
                <span className="font-bold text-slate-800">{totalLeaves}</span>{" "}
                {hasActiveFilters ? "filtered requests" : "requests"}
              </span>

              {hasMore ? (
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Loading more requests...</span>
                    </>
                  ) : (
                    <>
                      <span>Load More Leaves</span>
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                        {totalLeaves - historyData.length} left
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-medium italic">
                  All {hasActiveFilters ? "matching" : ""} leave requests loaded
                </span>
              )}
            </div>
          )
        }
      />

      {/* Leave Details Modal for Employee */}
      <EmployeeLeaveViewModal
        isOpen={!!selectedLeaveForView}
        leave={selectedLeaveForView}
        onClose={() => setSelectedLeaveForView(null)}
        onResend={handleResend}
        isRetrying={retryingId === selectedLeaveForView?._id}
        cooldownSeconds={selectedLeaveForView ? (cooldowns[selectedLeaveForView._id] || 0) : 0}
        onCancelLeave={handleCancelLeave}
        isCancelling={cancellingId === selectedLeaveForView?._id}
        onResendCancellation={handleResendCancellation}
        isRetryingCancellation={retryingCancellationId === selectedLeaveForView?._id}
        cancellationCooldownSeconds={selectedLeaveForView ? (cancellationCooldowns[selectedLeaveForView._id] || 0) : 0}
      />

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
