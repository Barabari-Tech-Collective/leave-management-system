import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import API from "../api/axiosConfig";
import {
  clearPendingReviewLeaveId,
  getPendingReviewLeaveId,
  isValidLeaveId
} from "../utils/reviewRedirect";

/**
 * Fetches and opens a deep-linked leave request (from `?leaveId=` or post-login storage)
 * while guarding against duplicate requests in React StrictMode.
 */
export default function useDeepLinkedLeaveReview(onLeaveLoaded) {
  const [searchParams, setSearchParams] = useSearchParams();
  const inFlightIdRef = useRef(null);
  const onLeaveLoadedRef = useRef(onLeaveLoaded);

  useEffect(() => {
    onLeaveLoadedRef.current = onLeaveLoaded;
  }, [onLeaveLoaded]);

  const queryLeaveId = searchParams.get("leaveId");
  const storedLeaveId = getPendingReviewLeaveId();
  const targetLeaveId = queryLeaveId || storedLeaveId;

  useEffect(() => {
    if (!targetLeaveId) {
      inFlightIdRef.current = null;
      return;
    }

    if (!isValidLeaveId(targetLeaveId)) {
      clearPendingReviewLeaveId();
      if (queryLeaveId) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("leaveId");
          return next;
        }, { replace: true });
      }
      inFlightIdRef.current = null;
      return;
    }

    if (inFlightIdRef.current === targetLeaveId) {
      return;
    }

    inFlightIdRef.current = targetLeaveId;

    const cleanupDeepLink = () => {
      clearPendingReviewLeaveId();
      if (queryLeaveId) {
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("leaveId");
          return next;
        }, { replace: true });
      }
    };

    API.get(`/leave/review/${targetLeaveId}`)
      .then((res) => {
        if (res.data?.leave) {
          const { status } = res.data.leave;
          if (status && status !== "pending") {
            toast(`This request was already ${status}.`, { icon: "ℹ️" });
          }
          onLeaveLoadedRef.current?.(res.data);
        }
        cleanupDeepLink();
      })
      .catch((err) => {
        // On 401, keep stored leaveId and stay silent — the auth redirect will handle login
        if (err.response?.status === 401) return;
        cleanupDeepLink();
        const data = err.response?.data;
        if (data?.isOwnLeave) {
          toast(data.message, { icon: "ℹ️" });
        } else {
          toast.error(data?.message || "Unable to open the requested leave.");
        }
        // Reset the ref so the user can retry if they navigate back
        inFlightIdRef.current = null;
      });
  }, [targetLeaveId, queryLeaveId, setSearchParams]);
}
