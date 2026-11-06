import EmployeeLeaveTable from "../../components/EmployeeLeaveTable";
import EmployeeLeaveViewModal from "../../components/EmployeeLeaveViewModal";
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
  const [cooldowns, setCooldowns] = useState({});
  const [selectedLeaveForView, setSelectedLeaveForView] = useState(null);
  const pollAttemptsRef = useRef(0);

  const fetchHistory = useCallback(async (targetPage = 1, append = false) => {
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingInitial(true);
      }

      const res = await API.get(`/leave/myleaves?page=${targetPage}&limit=10`);
      const items = res.data.leaves || (Array.isArray(res.data) ? res.data : []);
      const pagination = res.data.pagination;

      if (append) {
        setHistoryData((prev) => [...prev, ...items]);
      } else {
        setHistoryData(items);
      }

      if (pagination) {
        setHasMore(pagination.hasMore);
        setTotalLeaves(pagination.total);
        setPage(pagination.page);
      } else {
        setHasMore(false);
        setTotalLeaves(items.length);
      }

      // Initialize any active 5s cooldowns based on lastEmailAttemptAt
      const now = Date.now();
      const updatedCooldowns = {};
      items.forEach((item) => {
        if (item.emailStatus === "failed" && item.lastEmailAttemptAt) {
          const elapsed = Math.floor((now - new Date(item.lastEmailAttemptAt).getTime()) / 1000);
          if (elapsed < 5) {
            updatedCooldowns[item._id] = 5 - elapsed;
          }
        }
      });
      if (Object.keys(updatedCooldowns).length > 0) {
        setCooldowns((prev) => ({ ...prev, ...updatedCooldowns }));
      }
    } catch (err) {
      console.error("Failed to fetch leave history:", err);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory(1, false);
  }, [fetchHistory]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchHistory(page + 1, true);
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
        const res = await API.get(`/leave/myleaves?page=1&limit=${currentCount}`);
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
  }, [historyData]);

  // Tick active 5s countdown timers for email retry buttons
  useEffect(() => {
    const hasActiveCooldown = Object.values(cooldowns).some((sec) => sec > 0);
    if (!hasActiveCooldown) return;

    const timer = setInterval(() => {
      setCooldowns((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          if (next[id] > 0) {
            next[id] -= 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldowns]);

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

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
            Leave History
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Review your past and upcoming leave requests.
          </p>
        </div>
      </div>

      {/* Reusable Employee Leave Table */}
      <EmployeeLeaveTable
        leaves={historyData}
        loading={loadingInitial}
        loadingText="Loading leave history..."
        onViewLeave={setSelectedLeaveForView}
        showEmailStatus={true}
        retryingId={retryingId}
        cooldowns={cooldowns}
        onResendEmail={handleResend}
        emptyMessage="No leave requests found."
        footer={
          !loadingInitial && historyData.length > 0 && (
            <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{historyData.length}</span> of{" "}
                <span className="font-bold text-slate-800">{totalLeaves}</span> requests
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
                  All leave requests loaded
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
      />
    </div>
  );
}
