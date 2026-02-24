export default function StatusBadge({ status }) {
  const base = "px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border";

  const styles = {
    Approved: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 shadow-sm",
    Pending: "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 shadow-sm",
    Rejected: "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20 shadow-sm",
  };

  return (
    <span className={`${base} ${styles[status]}`}>
      {status}
    </span>
  );
}