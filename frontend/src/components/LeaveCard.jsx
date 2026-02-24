import { useEffect, useState } from "react";

export default function LeaveCard({ title, total, taken }) {
  const remaining = total - taken;
  const percentage = (remaining / total) * 100;

  const [displayValue, setDisplayValue] = useState(0);

  // Animate counter
  useEffect(() => {
    let start = 0;
    const duration = 600;
    const increment = remaining / (duration / 16);

    const counter = setInterval(() => {
      start += increment;
      if (start >= remaining) {
        start = remaining;
        clearInterval(counter);
      }
      setDisplayValue(Math.floor(start));
    }, 16);

    return () => clearInterval(counter);
  }, [remaining]);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl p-7 shadow-sm border border-slate-100 dark:border-neutral-800 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1.5 transition-all duration-500 space-y-5 relative group overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

      <div className="flex justify-between items-center relative z-10">
        <h2 className="font-bold text-lg text-textDark dark:text-white tracking-tight">{title}</h2>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-neutral-800 px-3 py-1 rounded-full border border-slate-100 dark:border-neutral-700">
          {taken}/{total} used
        </span>
      </div>

      <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-500 tracking-tight relative z-10 drop-shadow-sm">
        {displayValue}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 relative z-10">
        <div className="w-full bg-slate-100 dark:bg-neutral-800 rounded-full h-2.5 overflow-hidden shadow-inner flex">
          <div
            className="h-2.5 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-primary to-indigo-400 relative"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-white/20"></div>
          </div>
        </div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Remaining Leaves</p>
      </div>
    </div>
  );
}
