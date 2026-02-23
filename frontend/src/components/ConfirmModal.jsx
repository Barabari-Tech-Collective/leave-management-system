export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  actionType,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white p-8 rounded-3xl shadow-2xl shadow-slate-900/20 w-full max-w-sm space-y-6 animate-fadeIn transform transition-all">
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Confirm {actionType}
        </h2>

        <p className="text-slate-500 font-medium">
          Are you sure you want to {actionType.toLowerCase()} this leave request? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 hover:text-slate-800 transition-all duration-200"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-500 text-white font-bold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}