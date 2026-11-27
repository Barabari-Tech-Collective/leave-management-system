const STORAGE_KEY = "lms_pending_review_leave";
const PENDING_REVIEW_TTL_MS = 15 * 60 * 1000;
const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;

export const isValidLeaveId = (leaveId) => OBJECT_ID_REGEX.test(String(leaveId || "").trim());

export const savePendingReviewLeaveId = (leaveId) => {
  const normalized = String(leaveId || "").trim();
  if (!isValidLeaveId(normalized)) return;

  const payload = JSON.stringify({ leaveId: normalized, savedAt: Date.now() });
  try {
    sessionStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // Ignore storage errors in restricted browser modes
  }
};

const readStoredPayload = (storage) => {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !isValidLeaveId(parsed.leaveId)) return null;
    if (typeof parsed.savedAt !== "number" || Date.now() - parsed.savedAt > PENDING_REVIEW_TTL_MS) {
      return null;
    }
    return parsed.leaveId;
  } catch {
    return null;
  }
};

export const getPendingReviewLeaveId = () => {
  if (typeof window === "undefined") return null;
  return readStoredPayload(window.sessionStorage);
};

export const clearPendingReviewLeaveId = () => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
};
