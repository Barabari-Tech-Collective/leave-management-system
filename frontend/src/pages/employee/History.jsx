import StatusBadge from "../../components/StatusBadge";
import EmployeeLeaveViewModal from "../../components/EmployeeLeaveViewModal";
import EmailRetryButton from "../../components/EmailRetryButton";
import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle, Loader2, Eye } from "lucide-react";

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
      return; // Stop polling after 2 attempts
    }

    const pollTimer = setTimeout(() => {
      pollAttemptsRef.current += 1;
      fetchHistory(1, false);
    }, 2500);

    return () => clearTimeout(pollTimer);
  }, [historyData, fetchHistory]);

  // Countdown timer for cooldowns
  useEffect(() => {
    const hasActiveCooldown = Object.values(cooldowns).some((val) => val > 0);
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
            ? { ...item, emailStatus: "sent", emailError: "", lastEmailAttemptAt: new Date() }
            : item
        )
      );

      // Keep selected leave in sync if modal is open
      setSelectedLeaveForView((prev) =>
        prev && prev._id === leaveId
          ? { ...prev, emailStatus: "sent", emailError: "", lastEmailAttemptAt: new Date() }
          : prev
      );
    } catch (err) {
      const remainingSeconds = err.response?.data?.remainingSeconds;
      if (err.response?.status === 429 && remainingSeconds) {
        setCooldowns((prev) => ({ ...prev, [leaveId]: remainingSeconds }));
        toast.error(`Please wait ${remainingSeconds}s before retrying.`);
      } else {
        toast.error(err.response?.data?.message || "Email dispatch failed. Please try again later.");
        setCooldowns((prev) => ({ ...prev, [leaveId]: 5 }));
      }
      fetchHistory(1, false);
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

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
            <tr>
              <th className="py-4 px-5 text-left">Month</th>
              <th className="py-4 px-5 text-left">Type</th>
              <th className="py-4 px-5 text-left">Dates</th>
              <th className="py-4 px-5 text-left">Days</th>
              <th className="py-4 px-5 text-left">Status</th>
              <th className="py-4 px-5 text-left">Email Notification</th>
              <th className="py-4 px-5 text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {loadingInitial ? (
              <tr>
                <td colSpan="7" className="p-12 text-center text-slate-400 font-medium">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                    <span className="text-xs">Loading leave history...</span>
                  </div>
                </td>
              </tr>
            ) : historyData.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400 font-medium">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              historyData.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50/80 transition-colors duration-200"
                >
                  <td className="py-4 px-5 font-medium text-slate-700">{item.month}</td>
                  <td className="py-4 px-5 text-slate-700 capitalize font-semibold">{item.type}</td>
                  <td className="py-4 px-5 text-slate-600 whitespace-nowrap">
                    {item.from} <span className="text-slate-400 font-normal">to</span> {item.to}
                  </td>
                  <td className="py-4 px-5 font-bold text-slate-800">
                    {item.days} {item.days === 1 ? "day" : "days"}
                  </td>
                  <td className="py-4 px-5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="py-4 px-5">
                    {item.emailStatus === "sent" ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                        title="Accepted by the email provider; recipient delivery is not independently confirmed."
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Sent
                      </span>
                    ) : item.emailStatus === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        Sending...
                      </span>
                    ) : item.emailStatus === "failed" ? (
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                          title={item.emailError || "Email failed to dispatch"}
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          Failed
                        </span>
                        <EmailRetryButton
                          onRetry={() => handleResend(item._id)}
                          isRetrying={retryingId === item._id}
                          cooldownSeconds={cooldowns[item._id] || 0}
                          size="xs"
                        />
                      </div>
                    ) : null}
                  </td>
                  <td className="py-4 px-5 text-right whitespace-nowrap">
                    <button
                      onClick={() => setSelectedLeaveForView(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-xl text-xs transition border border-indigo-200 cursor-pointer shadow-2xs"
                    >
                      <Eye size={14} />
                      <span>View</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Load More Footer */}
        {!loadingInitial && historyData.length > 0 && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
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
        )}
      </div>

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
