import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Reusable countdown timer hook for rate-limited action buttons (e.g. Email resend cooldowns).
 * Manages an object of { [id]: remainingSeconds }, decrementing active counters every 1000ms.
 */
export default function useCooldownTimer() {
  const [cooldowns, setCooldowns] = useState({});
  const timerRef = useRef(null);

  useEffect(() => {
    const hasActive = Object.values(cooldowns).some((val) => val > 0);

    if (hasActive && !timerRef.current) {
      timerRef.current = setInterval(() => {
        setCooldowns((prev) => {
          let hasRemaining = false;
          const next = {};
          Object.keys(prev).forEach((id) => {
            if (prev[id] > 1) {
              next[id] = prev[id] - 1;
              hasRemaining = true;
            }
          });
          if (!hasRemaining && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return next;
        });
      }, 1000);
    } else if (!hasActive && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [cooldowns]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startCooldown = useCallback((id, seconds = 5) => {
    if (!id) return;
    setCooldowns((prev) => ({ ...prev, [id]: Math.max(1, parseInt(seconds, 10) || 5) }));
  }, []);

  const getCooldown = useCallback(
    (id) => (id && cooldowns[id] ? cooldowns[id] : 0),
    [cooldowns]
  );

  return {
    cooldowns,
    setCooldowns,
    startCooldown,
    getCooldown,
  };
}
