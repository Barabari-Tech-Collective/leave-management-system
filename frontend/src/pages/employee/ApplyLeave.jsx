import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../../api/axiosConfig";
import { Calendar, Clock, CheckCircle, AlertTriangle, ArrowRight, Wallet, Info } from "lucide-react";
import LeaveSummaryConfirmModal from "../../components/LeaveSummaryConfirmModal";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { getNationalHolidays } from "../../constants/leaveConstants";

// Helper: string "YYYY-MM-DD" -> local Date object
const parseLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

// Helper: local Date object -> "YYYY-MM-DD" string
const formatLocalDate = (dateObj) => {
  if (!dateObj || !(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Helper: determine if a date is selectable (exclude all Sundays and National Holidays)
const isSelectableDate = (date) => {
  if (!date) return false;
  // 1. Disable Sundays (0 in getDay())
  if (date.getDay() === 0) return false;

  // 2. Disable National Holidays
  const holidays = getNationalHolidays(date.getFullYear());
  const isNationalHoliday = holidays.some((h) => {
    return (
      h.date.getFullYear() === date.getFullYear() &&
      h.date.getMonth() === date.getMonth() &&
      h.date.getDate() === date.getDate()
    );
  });

  return !isNationalHoliday;
};

export default function ApplyLeave() {
  const navigate = useNavigate();
  const [isPastLeave, setIsPastLeave] = useState(false);
  const [form, setForm] = useState({
    type: "",
    from: "",
    to: "",
    reason: "",
  });

  const [error, setError] = useState("");
  const [pendingConflict, setPendingConflict] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // User balances and pending requests
  const [userBalances, setUserBalances] = useState(null);
  const [pendingDaysByType, setPendingDaysByType] = useState({
    casual: 0,
    sick: 0,
    flexible: 0,
    extra: 0
  });

  // Today's date formatted as YYYY-MM-DD in Indian Standard Time (Asia/Kolkata)
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  // Yesterday's date (maximum selectable date for past leaves calculated deterministically via UTC)
  const yesterdayStr = (() => {
    const d = new Date(`${todayStr}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().split("T")[0];
  })();

  const currentYear = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric"
  }).format(new Date());
  const startOfYearStr = `${currentYear}-01-01`;

  // Determine target year dynamically from the From Date (or default to current calendar year)
  const targetYear = form.from ? parseInt(form.from.split("-")[0], 10) : parseInt(currentYear, 10);

  // Fetch balances and active pending leaves on mount or whenever targetYear changes
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const yearParam = targetYear ? `?year=${targetYear}` : "";
        const [userRes, leavesRes] = await Promise.allSettled([
          API.get(`/users/me${yearParam}`),
          API.get(`/leave/myleaves?status=pending&limit=100${targetYear ? `&year=${targetYear}` : ""}`)
        ]);

        if (userRes.status === "fulfilled" && userRes.value?.data?.leaveBalance) {
          setUserBalances(userRes.value.data.leaveBalance);
        }

        if (leavesRes.status === "fulfilled") {
          const rawLeaves = leavesRes.value?.data?.leaves || leavesRes.value?.data || [];
          const pendingMap = { casual: 0, sick: 0, flexible: 0, extra: 0 };
          rawLeaves.forEach((item) => {
            if (item.status === "pending" && item.type && pendingMap[item.type] !== undefined) {
              pendingMap[item.type] += (item.days || 0);
            }
          });
          setPendingDaysByType(pendingMap);
        }
      } catch (err) {
        console.error("Failed to load user leave balances:", err);
      }
    };

    fetchUserData();
  }, [targetYear]);

  const typeMap = {
    Casual: "casual",
    Sick: "sick",
    "Flexible Cultural": "flexible",
    "Extra Leave": "extra",
    "Extra Leave (Loss of Pay)": "extra",
  };

  const selectedTypeKey = form.type ? typeMap[form.type] : null;
  const isExtraType = selectedTypeKey === "extra";

  // Calculate if the 26 annual paid leaves are fully exhausted (including pending requests)
  const totalPaidTaken = userBalances
    ? (userBalances.casual?.taken || 0) + (userBalances.sick?.taken || 0) + (userBalances.flexible?.taken || 0)
    : 0;
  const totalPendingPaid = (pendingDaysByType.casual || 0) + (pendingDaysByType.sick || 0) + (pendingDaysByType.flexible || 0);
  const isPaidQuotaExhausted = (totalPaidTaken + totalPendingPaid) >= 26;

  // Auto-reset Extra Leave selection if user switches to a year or state where quota is unexhausted
  useEffect(() => {
    if (form.type === "Extra Leave" && !isPaidQuotaExhausted) {
      setForm((prev) => ({ ...prev, type: "" }));
    }
  }, [isPaidQuotaExhausted, form.type]);

  const currentCategoryBalance = (userBalances && selectedTypeKey && !isExtraType)
    ? userBalances[selectedTypeKey]
    : null;
  const totalQuota = currentCategoryBalance?.total || 0;
  const takenCount = currentCategoryBalance?.taken || 0;
  const rawRemaining = isExtraType ? 999 : Math.max(0, totalQuota - takenCount);
  const pendingCount = selectedTypeKey ? (pendingDaysByType[selectedTypeKey] || 0) : 0;
  const effectiveAvailable = isExtraType ? 999 : Math.max(0, rawRemaining - pendingCount);

  // Helper function: Calculate total days excluding Sundays (deterministic UTC arithmetic)
  const calculateDaysExcludingSundays = (fromStr, toStr) => {
    if (!fromStr || !toStr) return 0;

    const [y1, m1, d1] = fromStr.split("-").map(Number);
    const [y2, m2, d2] = toStr.split("-").map(Number);

    const current = new Date(Date.UTC(y1, m1 - 1, d1));
    const end = new Date(Date.UTC(y2, m2 - 1, d2));

    if (end < current) return 0;

    let count = 0;
    while (current <= end) {
      if (current.getUTCDay() !== 0) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
  };

  const calculatedDays = calculateDaysExcludingSundays(form.from, form.to);

  const handleModeChange = (modeIsPast) => {
    if (isPastLeave === modeIsPast) return;
    setIsPastLeave(modeIsPast);
    setForm((prev) => ({ ...prev, from: "", to: "" }));
    setError("");
    setPendingConflict(null);
  };

  const handleReviewClick = (e) => {
    e.preventDefault();
    setError("");
    setPendingConflict(null);

    if (!form.type || !form.from || !form.to || !form.reason.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const fromDateObj = parseLocalDate(form.from);
    const toDateObj = parseLocalDate(form.to);
    if (!isSelectableDate(fromDateObj)) {
      setError("'From Date' cannot be a Sunday or a National Holiday.");
      return;
    }
    if (!isSelectableDate(toDateObj)) {
      setError("'To Date' cannot be a Sunday or a National Holiday.");
      return;
    }

    if (new Date(form.to) < new Date(form.from)) {
      setError("'To Date' cannot be earlier than 'From Date'.");
      return;
    }

    const fromYear = form.from.split("-")[0];
    const toYear = form.to.split("-")[0];
    if (fromYear !== toYear) {
      setError(`Leaves cannot span across two different calendar years (${fromYear} and ${toYear}). Please submit two separate requests: one for ${fromYear} and one for ${toYear}.`);
      return;
    }

    if (parseInt(fromYear, 10) > parseInt(currentYear, 10) + 1) {
      setError(`Leaves can only be booked for the current year (${currentYear}) or up to one year in advance (${parseInt(currentYear, 10) + 1}).`);
      return;
    }

    if (isPastLeave) {
      if (form.to >= todayStr) {
        setError("Past leave dates must be strictly before today. To apply for today or upcoming dates, switch to 'Future Leave Request'.");
        return;
      }
    } else {
      if (form.from < todayStr) {
        setError("'From Date' cannot be in the past for regular leave requests. Switch to 'Report Past Leave' instead.");
        return;
      }
    }

    if (calculatedDays <= 0) {
      setError("Selected duration contains no working days (e.g. only Sunday).");
      return;
    }

    // 1. Raw remaining quota check (Bypassed for Extra Leaves)
    if (userBalances && selectedTypeKey && !isExtraType) {
      if (calculatedDays > rawRemaining) {
        setError(`You don't have enough leaves left to take for ${targetYear}. (Required: ${calculatedDays}, Remaining: ${rawRemaining})`);
        return;
      }

      // 2. Pending leaves conflict check
      if (calculatedDays > effectiveAvailable) {
        const errorMsg = `You have ${rawRemaining} remaining ${form.type} leave(s) for ${targetYear}, but ${pendingCount} day(s) are currently pending for approval. Please cancel your pending leave request(s) to apply for this leave.`;
        setError(errorMsg);
        setPendingConflict({
          hasConflict: true,
          rawRemaining,
          pendingDays: pendingCount,
          type: form.type
        });
        return;
      }
    }

    // All pre-checks pass: open confirmation summary modal
    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    try {
      setIsSubmitting(true);
      setError("");

      const res = await API.post("/leave/apply", {
        type: typeMap[form.type],
        fromDate: form.from,
        toDate: form.to,
        reason: form.reason.trim(),
        isPastLeave,
        isExtraLeave: isExtraType,
      });

      setShowConfirmModal(false);

      if (res.data?.emailSent) {
        toast.success(
          isPastLeave
            ? "Past leave recorded! Notification email dispatched."
            : "Leave applied! Notification email dispatched."
        );
      } else {
        toast(
          isPastLeave
            ? "Past leave recorded! Checking notification status..."
            : "Leave applied! Checking notification status...",
          { icon: "⏳" }
        );
      }

      // Immediately redirect to history page
      navigate("/employee/history", {
        state: { newlyCreatedLeaveId: res.data?.leave?._id }
      });
    } catch (err) {
      setShowConfirmModal(false);
      const errorData = err.response?.data;
      const errorMsg = errorData?.message || "Failed to process leave request";
      setError(errorMsg);
      if (errorData?.hasPendingConflict) {
        setPendingConflict({
          hasConflict: true,
          rawRemaining: errorData.rawRemaining,
          pendingDays: errorData.pendingDays,
          type: form.type
        });
      }
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-3 sm:py-6 px-1 sm:px-4">
      <form
        onSubmit={handleReviewClick}
        className="relative bg-white w-full max-w-2xl p-4 sm:p-7 md:p-10 rounded-2xl sm:rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 space-y-5 sm:space-y-7 animate-fadeIn overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary via-indigo-400 to-indigo-600"></div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-primary to-indigo-600 tracking-tight text-center">
            {isPastLeave ? "Report Past Leave" : "Apply for Leave"}
          </h2>
          <p className="text-center text-slate-500 mt-1 sm:mt-2 font-medium text-xs sm:text-sm">
            {isPastLeave
              ? "Record a leave you have already taken without needing lead approval."
              : "Fill in the details below to submit a future leave request."}
          </p>
        </div>

        {/* Mode Selector Segmented Tabs */}
        <div className="grid grid-cols-2 p-1 sm:p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => handleModeChange(false)}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              !isPastLeave
                ? "bg-white text-primary shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calendar size={15} className="shrink-0" />
            <span className="truncate">Future Leave Request</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange(true)}
            className={`py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
              isPastLeave
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock size={15} className="shrink-0" />
            <span className="truncate">Report Past Leave</span>
          </button>
        </div>

        {/* Automated Notification Info Banner */}
        <div
          className={`p-3.5 sm:p-4 border rounded-2xl flex items-start gap-2.5 sm:gap-3 text-xs font-medium transition-all ${
            isPastLeave
              ? "bg-emerald-50/70 border-emerald-200 text-emerald-800"
              : "bg-indigo-50/70 border-indigo-100 text-indigo-700"
          }`}
        >
          {isPastLeave ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <span className="text-base shrink-0">📢</span>
          )}
          <p className="leading-relaxed">
            {isPastLeave ? (
              <>
                <strong>Past Leave Notice:</strong> This leave will be automatically recorded and your balance will be updated immediately. A notification email will be sent to your <strong>Vertical Lead</strong>, <strong>Vertical Teammates</strong>, <strong>Founders</strong>, and <strong>Admins</strong> for their records (no approval required).
              </>
            ) : (
              <>
                An automated notification email will be sent to your <strong>Vertical Lead</strong>, <strong>Vertical Teammates</strong>, <strong>Founders</strong>, and <strong>Admins</strong> upon submission for approval.
              </>
            )}
          </p>
        </div>

        {/* Exhaustion Banner if all 26 paid leaves are exhausted */}
        {isPaidQuotaExhausted && (
          <div className="space-y-3">
            <div className="p-3.5 sm:p-4 border rounded-2xl flex items-start gap-2.5 sm:gap-3 text-xs font-medium bg-amber-50 border-amber-300 text-amber-900 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">26 Annual Paid Leaves Exhausted ({targetYear})</p>
                <p className="mt-0.5 leading-relaxed">
                  You have utilized all 26 annual paid leaves for {targetYear}. You can apply for an <strong>Extra Leave</strong> below. Extra leaves are tracked separately and forwarded to the <strong>Finance Team</strong> for payroll adjustments.
                </p>
              </div>
            </div>

            {totalPendingPaid > 0 && (
              <div className="p-3.5 sm:p-4 border rounded-2xl flex items-start gap-2.5 sm:gap-3 text-xs font-medium bg-blue-50 border-blue-300 text-blue-950 shadow-2xs">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <p className="font-bold text-sm text-blue-950 flex items-center gap-1.5">
                    <span>Pending Paid Leaves Available for Reuse</span>
                  </p>
                  <p className="mt-1 text-blue-900">
                    You already have <strong>{totalPendingPaid} {totalPendingPaid === 1 ? "leave" : "leaves"} pending approval</strong> ({totalPaidTaken} used + {totalPendingPaid} pending = 26 total). You can cancel your pending leave request(s) from your Leave History to reuse them instead of applying for extra leave.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leave Type Selector with Live Balance Pill */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <label className="font-bold text-slate-700 text-sm">Leave Type</label>
            {isExtraType ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] sm:text-xs font-bold shadow-2xs">
                ⚠️ Extra Leave • Notified to Finance
              </span>
            ) : selectedTypeKey && currentCategoryBalance && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-[11px] sm:text-xs font-bold shadow-2xs">
                <Wallet size={12} className="text-emerald-600" />
                Available: {effectiveAvailable} day(s)
                {pendingCount > 0 && (
                  <span className="text-amber-700 font-semibold">({pendingCount} pending)</span>
                )}
              </span>
            )}
          </div>

          <select
            className="w-full p-3 sm:p-4 border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium cursor-pointer text-sm"
            value={form.type}
            onChange={(e) => {
              setForm({ ...form, type: e.target.value });
              setError("");
              setPendingConflict(null);
            }}
          >
            <option value="">Select Leave Type</option>
            <option value="Casual">Casual (11)</option>
            <option value="Sick">Sick (10)</option>
            <option value="Flexible Cultural">Flexible Cultural (5)</option>
            {isPaidQuotaExhausted && (
              <option value="Extra Leave">
                Extra Leave {userBalances?.extra?.taken ? `[${userBalances.extra.taken} taken]` : ""}
              </option>
            )}
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label className="block mb-1.5 font-bold text-slate-700 text-sm">From Date</label>
            <DatePicker
              selected={parseLocalDate(form.from)}
              onChange={(date) => {
                const newFrom = formatLocalDate(date);
                setForm((prev) => ({
                  ...prev,
                  from: newFrom,
                  // If existing 'to' is earlier than the new 'from', reset 'to'
                  to: prev.to && prev.to < newFrom ? "" : prev.to,
                }));
                setError("");
                setPendingConflict(null);
              }}
              filterDate={isSelectableDate}
              minDate={parseLocalDate(isPastLeave ? startOfYearStr : todayStr)}
              maxDate={isPastLeave ? parseLocalDate(yesterdayStr) : undefined}
              dateFormat="dd-MM-yyyy"
              placeholderText="DD-MM-YYYY"
              wrapperClassName="w-full"
              className="w-full p-3 sm:p-4 border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium text-sm cursor-pointer"
            />
          </div>

          <div>
            <label className="block mb-1.5 font-bold text-slate-700 text-sm">To Date</label>
            <DatePicker
              selected={parseLocalDate(form.to)}
              onChange={(date) => {
                setForm((prev) => ({ ...prev, to: formatLocalDate(date) }));
                setError("");
                setPendingConflict(null);
              }}
              filterDate={isSelectableDate}
              minDate={parseLocalDate(form.from) || parseLocalDate(isPastLeave ? startOfYearStr : todayStr)}
              maxDate={isPastLeave ? parseLocalDate(yesterdayStr) : undefined}
              dateFormat="dd-MM-yyyy"
              placeholderText="DD-MM-YYYY"
              wrapperClassName="w-full"
              className="w-full p-3 sm:p-4 border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium text-sm cursor-pointer"
            />
          </div>
        </div>

        {/* Live Days Counter (Excluding Sundays) */}
        {calculatedDays > 0 && (
          <div className="bg-primary/5 border border-primary/20 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center space-y-1">
            <span className="text-[11px] sm:text-xs text-primary font-bold tracking-wide uppercase">
              {isPastLeave ? "Total Working Days Recorded" : "Total Working Days Requested"}
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-primary">
              {calculatedDays} {calculatedDays === 1 ? "Day" : "Days"}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium">
              (Intervening Sundays are excluded as per Rule)
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block mb-1.5 font-bold text-slate-700 text-sm">Reason</label>
          <textarea
            rows="3"
            placeholder={
              isPastLeave
                ? "State the reason for this past leave..."
                : "Briefly describe the reason for your leave..."
            }
            className="w-full p-3 sm:p-4 border border-slate-200 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium resize-none text-sm"
            value={form.reason}
            onChange={(e) => {
              setForm({ ...form, reason: e.target.value });
              setError("");
              setPendingConflict(null);
            }}
          />
        </div>

        {/* Error / Conflict Feedback */}
        {error && (
          <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>

            {/* Direct Quick Action: Navigate to Leave History if pending leaves conflict */}
            {pendingConflict?.hasConflict && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/employee/history")}
                  className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  <span>Go to Leave History</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-logoBlue text-white font-bold py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer text-base sm:text-lg tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>{isPastLeave ? "Review Past Leave Record" : "Review & Submit Leave"}</span>
          <ArrowRight size={18} />
        </button>
      </form>

      {/* Intelligent Summary & Confirmation Modal */}
      <LeaveSummaryConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleFinalSubmit}
        isSubmitting={isSubmitting}
        leaveData={{
          type: form.type,
          from: form.from,
          to: form.to,
          days: calculatedDays,
          reason: form.reason.trim(),
          isPastLeave
        }}
        balanceData={{
          totalQuota,
          taken: takenCount,
          pending: pendingCount,
          effectiveAvailable,
          totalPendingPaid
        }}
      />
    </div>
  );
}
