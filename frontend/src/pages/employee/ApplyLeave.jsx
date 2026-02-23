import { useState } from "react";

export default function ApplyLeave() {
  const leaveLimits = {
    Casual: 10,
    Sick: 8,
    "Flexible Cultural": 5,
  };

  const [form, setForm] = useState({
    type: "",
    from: "",
    to: "",
    reason: "",
  });

  const [error, setError] = useState("");

  const calculateDays = () => {
    if (!form.from || !form.to) return 0;
    const fromDate = new Date(form.from);
    const toDate = new Date(form.to);
    const diffTime = toDate - fromDate;
    const days = diffTime / (1000 * 60 * 60 * 24) + 1;
    return days > 0 ? days : 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const days = calculateDays();

    if (!form.type || !form.from || !form.to || !form.reason) {
      return setError("All fields are required.");
    }

    if (new Date(form.to) < new Date(form.from)) {
      return setError("To date cannot be before From date.");
    }

    if (days > leaveLimits[form.type]) {
      return setError("Not enough remaining leaves.");
    }

    setError("");
    alert("Leave Applied Successfully 🚀");
  };

  return (
    <div className="flex justify-center items-center py-6 px-4">
      <form
        onSubmit={handleSubmit}
        className="relative bg-white w-full max-w-2xl p-10 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 space-y-8 animate-fadeIn overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary via-indigo-400 to-indigo-600"></div>

        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600 tracking-tight text-center">
            Apply for Leave
          </h2>
          <p className="text-center text-slate-500 mt-2 font-medium">
            Fill in the details below to submit a leave request.
          </p>
        </div>

        {/* Leave Type */}
        <div className="space-y-4">
          <label className="block mb-2 font-bold text-slate-700">Leave Type</label>
          <select
            className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
          >
            <option value="">Select Leave Type</option>
            <option value="Casual">Casual (10)</option>
            <option value="Sick">Sick (8)</option>
            <option value="Flexible Cultural">
              Flexible Cultural (5)
            </option>
            <option disabled>National (Disabled)</option>
          </select>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block mb-2 font-bold text-slate-700">From Date</label>
            <input
              type="date"
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium"
              value={form.from}
              onChange={(e) =>
                setForm({ ...form, from: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block mb-2 font-bold text-slate-700">To Date</label>
            <input
              type="date"
              className="w-full p-4 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all shadow-inner bg-slate-50/50 text-slate-700 font-medium"
              value={form.to}
              onChange={(e) =>
                setForm({ ...form, to: e.target.value })
              }
            />
          </div>
        </div>

        {/* Live Days Counter */}
        {calculateDays() > 0 && (
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-2xl text-center">
            <span className="text-sm text-primary font-bold tracking-wide uppercase">
              Total Leave Days Requested
            </span>
            <div className="text-3xl font-extrabold text-primary mt-1">
              {calculateDays()}
            </div>
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
            onChange={(e) =>
              setForm({ ...form, reason: e.target.value })
            }
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 border border-red-200 text-sm font-medium p-4 rounded-2xl text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-gradient-to-r from-primary to-indigo-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 cursor-pointer text-lg tracking-wide"
        >
          Submit Leave Request
        </button>
      </form>
    </div>
  );
}