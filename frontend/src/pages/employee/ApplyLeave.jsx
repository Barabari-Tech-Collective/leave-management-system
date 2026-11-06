import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../../api/axiosConfig";

export default function ApplyLeave() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: "",
    from: "",
    to: "",
    reason: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get today's date formatted as YYYY-MM-DD for min date restriction
  const todayStr = new Date().toISOString().split("T")[0];

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
      // 0 represents Sunday in UTC Date
      if (current.getUTCDay() !== 0) {
        count++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return count;
  };

  const calculatedDays = calculateDaysExcludingSundays(form.from, form.to);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const typeMap = {
      Casual: "casual",
      Sick: "sick",
      "Flexible Cultural": "flexible",
    };

    if (!form.type || !form.from || !form.to || !form.reason) {
      setError("Please fill in all fields.");
      return;
    }

    if (new Date(form.to) < new Date(form.from)) {
      setError("'To Date' cannot be earlier than 'From Date'.");
      return;
    }

    if (calculatedDays <= 0) {
      setError("Selected duration contains no working days (e.g. only Sunday).");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await API.post("/leave/apply", {
        type: typeMap[form.type],
        fromDate: form.from,
        toDate: form.to,
        reason: form.reason,
      });

      if (res.data?.emailSent) {
        toast.success("Leave applied! Notification email dispatched.");
      } else {
        toast("Leave applied! Checking notification status...", { icon: "⏳" });
      }

      // Immediately redirect to history page
      navigate("/employee/history", {
        state: { newlyCreatedLeaveId: res.data?.leave?._id }
      });
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Failed to apply leave";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center py-6 px-4">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white w-full max-w-2xl p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 space-y-8 animate-fadeIn overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary via-indigo-400 to-indigo-600"></div>

        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-primary to-indigo-600 tracking-tight text-center">
            Apply for Leave
          </h2>
          <p className="text-center text-slate-500 mt-2 font-medium text-sm">
            Fill in the details below to submit a leave request.
          </p>
        </div>

        {/* Automated Notification Info Banner */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center gap-3 text-xs text-indigo-700 font-medium">
          {/* <span className="text-base">📢</span> */}
          <p>
            An automated notification email will be sent to your <strong>Vertical Lead</strong>, <strong>Vertical Teammates</strong>, <strong>Founders</strong>, and <strong>Admins</strong> upon submission.
          </p>
        </div>

        {/* Leave Type */}
        <div className="space-y-4">
          <label className="block mb-2 font-bold text-slate-700">Leave Type</label>
          <select
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium"
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
          >
            <option value="">Select Leave Type</option>
            <option value="Casual">Casual (11)</option>
            <option value="Sick">Sick (10)</option>
            <option value="Flexible Cultural">Flexible Cultural (5)</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-bold text-slate-700">From Date</label>
            <input
              type="date"
              min={todayStr}
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium"
              value={form.from}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-slate-700">To Date</label>
            <input
              type="date"
              min={form.from || todayStr}
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium"
              value={form.to}
              onChange={(e) => setForm({ ...form, to: e.target.value })}
            />
          </div>
        </div>

        {/* Live Days Counter (Excluding Sundays) */}
        {calculatedDays > 0 && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl text-center space-y-1">
            <span className="text-xs text-primary font-bold tracking-wide uppercase">
              Total Working Days Requested
            </span>
            <div className="text-3xl font-extrabold text-primary">
              {calculatedDays} {calculatedDays === 1 ? "Day" : "Days"}
            </div>
            <p className="text-[11px] text-slate-500 font-medium">
              (Intervening Sundays are excluded as per Rule)
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label className="block mb-2 font-bold text-slate-700">Reason</label>
          <textarea
            rows="4"
            placeholder="Briefly describe the reason for your leave..."
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium resize-none"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 text-sm font-medium p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-linear-to-r from-primary to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 cursor-pointer text-lg tracking-wide disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Submitting Leave...</span>
            </>
          ) : (
            <span>Submit Leave Request</span>
          )}
        </button>
      </form>
    </div>
  );
}