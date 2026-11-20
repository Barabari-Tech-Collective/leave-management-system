import React from "react";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * Reusable Email Retry Button with in-flight spinner, countdown timer, and cooldown protection.
 *
 * @param {Function} onRetry - Handler called when the retry button is clicked.
 * @param {boolean} isRetrying - Whether this specific item is currently in-flight.
 * @param {number} cooldownSeconds - Remaining cooldown seconds (> 0 means cooldown active).
 * @param {string} [label="Retry"] - Text label when idle.
 * @param {string} [className] - Additional custom Tailwind CSS classes.
 * @param {string} [size="xs"] - Size variant: "xs" (table compact) | "sm" (modal standard).
 */
export default function EmailRetryButton({
  onRetry,
  isRetrying = false,
  cooldownSeconds = 0,
  label = "Retry",
  className = "",
  size = "xs"
}) {
  const isCooldown = cooldownSeconds > 0;
  const isDisabled = isRetrying || isCooldown;

  const sizeClasses = size === "xs"
    ? "px-2.5 py-1 text-xs gap-1.5 rounded-lg"
    : "px-3.5 py-1.5 text-xs gap-2 rounded-xl";

  return (
    <button
      type="button"
      onClick={onRetry}
      disabled={isDisabled}
      className={`inline-flex items-center font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs cursor-pointer ${sizeClasses} ${className}`}
      title={isCooldown ? `Please wait ${cooldownSeconds}s before retrying` : "Retry sending email notification"}
    >
      {isRetrying ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-slate-600" />
          <span>Sending...</span>
        </>
      ) : isCooldown ? (
        <span>Wait {cooldownSeconds}s</span>
      ) : (
        <>
          <RefreshCw className="w-3 h-3 text-slate-600" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

