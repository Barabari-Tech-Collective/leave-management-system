import { useEffect, useState } from "react";

export default function LeaveCard({ title, total, taken, isCounterOnly = false, badgeText = null }) {
  const isExtra = isCounterOnly || total === null || total === undefined;
  const remaining = isExtra ? taken : (total - taken);
  const percentage = isExtra ? 100 : Math.max(0, Math.min(100, (remaining / total) * 100));

  const [displayValue, setDisplayValue] = useState(0);

  // Animate counter
  useEffect(() => {
    const target = remaining;
    if (target <= 0) {
      const timer = setTimeout(() => {
        setDisplayValue(0);
      }, 0);
      return () => clearTimeout(timer);
    }

    let start = 0;
    const duration = 600;
    const increment = target / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= target) {
        start = target;
        clearInterval(counter);
      }
      setDisplayValue(Math.floor(start));
    }, 16);

    return () => clearInterval(counter);
  }, [remaining]);

  return (
    <div
      className={`bg-white rounded-2xl sm:rounded-3xl p-5 sm:p-7 shadow-sm border ${
        isExtra ? "border-amber-200/80 hover:shadow-amber-500/10" : "border-slate-100 hover:shadow-primary/5"
      } hover:shadow-xl hover:-translate-y-1.5 transition-all duration-500 space-y-4 sm:space-y-5 relative group overflow-hidden`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${
          isExtra ? "from-amber-500/10 via-amber-400/5 to-transparent" : "from-primary/5 to-transparent"
        } opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
      ></div>

      <div className="space-y-1.5 relative z-10">
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            {isExtra ? "Additional" : "Leave Quota"}
          </span>
          <span
            className={`text-[11px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${
              isExtra
                ? "text-amber-800 bg-amber-50 border-amber-200"
                : "text-slate-600 bg-slate-50 border-slate-200"
            }`}
          >
            {badgeText || (isExtra ? "Extra Leave" : `${taken}/${total} used`)}
          </span>
        </div>
        <h2 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight leading-snug break-words">
          {title}
        </h2>
      </div>

      <div
        className={`text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text tracking-tight relative z-10 drop-shadow-sm ${
          isExtra
            ? "bg-gradient-to-r from-amber-600 to-orange-500"
            : "bg-gradient-to-r from-primary to-indigo-500"
        }`}
      >
        {displayValue}
      </div>

      {/* Progress Bar or Indicator */}
      <div className="space-y-2 relative z-10">
        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden shadow-inner flex">
          <div
            className={`h-2.5 rounded-full transition-all duration-1000 ease-out relative ${
              isExtra
                ? "bg-gradient-to-r from-amber-500 to-orange-400"
                : "bg-gradient-to-r from-primary to-indigo-400"
            }`}
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20"></div>
          </div>
        </div>
        <p className="text-xs sm:text-sm font-medium text-slate-500">
          {isExtra ? "Total Extra Leaves Taken" : "Remaining Leaves"}
        </p>
      </div>
    </div>
  );
}
