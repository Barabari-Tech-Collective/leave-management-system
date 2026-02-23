export default function StatusBadge({ status }) {
  const base = "px-3 py-1.5 rounded-full text-xs font-bold tracking-wide border";

  const styles = {
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm",
    Pending: "bg-amber-50 text-amber-700 border-amber-200 shadow-sm",
    Rejected: "bg-rose-50 text-rose-700 border-rose-200 shadow-sm",
  };

  return (
    <span className={`${base} ${styles[status]}`}>
      {status}
    </span>
  );
}