import StatusBadge from "../../components/StatusBadge";
import { useEffect, useState, useCallback, useRef } from "react";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";

export default function History() {
  const [historyData, setHistoryData] = useState([]);
  const [retryingId, setRetryingId] = useState(null);
  const [cooldowns, setCooldowns] = useState({});
  const pollAttemptsRef = useRef(0);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await API.get("/leave/myleaves");
      setHistoryData(res.data);

      // Initialize any active 5s cooldowns based on lastEmailAttemptAt
      const now = Date.now();
      const updatedCooldowns = {};
      res.data.forEach((item) => {
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
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

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
      fetchHistory();
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
    } catch (err) {
      const remainingSeconds = err.response?.data?.remainingSeconds;
      if (err.response?.status === 429 && remainingSeconds) {
        setCooldowns((prev) => ({ ...prev, [leaveId]: remainingSeconds }));
        toast.error(`Please wait ${remainingSeconds}s before retrying.`);
      } else {
        toast.error(err.response?.data?.message || "Email dispatch failed. Please try again later.");
        setCooldowns((prev) => ({ ...prev, [leaveId]: 5 }));
      }
      // Refresh to ensure synced state
      fetchHistory();
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
              <th className="p-5 text-left">Month</th>
              <th className="p-5 text-left">Type</th>
              <th className="p-5 text-left">From</th>
              <th className="p-5 text-left">To</th>
              <th className="p-5 text-left">Days</th>
              <th className="p-5 text-left">Reason</th>
              <th className="p-5 text-left">Status</th>
              <th className="p-5 text-left">Email Notification</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {historyData.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                  No leave requests found.
                </td>
              </tr>
            ) : (
              historyData.map((item) => (
                <tr
                  key={item._id}
                  className="hover:bg-slate-50/80 transition-colors duration-200"
                >
                  <td className="p-5 font-medium text-slate-700">{item.month}</td>
                  <td className="p-5 text-slate-600">{item.type}</td>
                  <td className="p-5 text-slate-500">{item.from}</td>
                  <td className="p-5 text-slate-500">{item.to}</td>
                  <td className="p-5 font-bold text-slate-700">{item.days}</td>
                  <td className="p-5 text-slate-600 max-w-xs truncate">{item.reason}</td>
                  <td className="p-5">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="p-5">
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
                          <button
                            type="button"
                            onClick={() => handleResend(item._id)}
                            disabled={retryingId === item._id || (cooldowns[item._id] > 0)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                          >
                            {retryingId === item._id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
                                <span>Sending...</span>
                              </>
                            ) : cooldowns[item._id] > 0 ? (
                              <span>Wait {cooldowns[item._id]}s</span>
                            ) : (
                              <>
                                <RefreshCw className="w-3 h-3 text-slate-600" />
                                <span>Retry</span>
                              </>
                            )}
                          </button>
                        </div>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}