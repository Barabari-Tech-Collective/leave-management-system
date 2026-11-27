import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";
import toast from "react-hot-toast";
import {
  clearPendingReviewLeaveId,
  isValidLeaveId,
  savePendingReviewLeaveId
} from "../utils/reviewRedirect";

/**
 * Handles deep-link URLs from leave notification emails (`/review-leave/:id`).
 * Preserves the leave ID across login/OAuth and routes authenticated users by role.
 */
export default function ReviewLeaveRedirect() {
  const { id } = useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || user === undefined) return;

    if (!isValidLeaveId(id)) {
      clearPendingReviewLeaveId();
      if (!user) {
        navigate("/", { replace: true });
      } else if (user.role === "admin" || user.role === "founder") {
        navigate("/admin", { replace: true });
      } else if (user.isVerticalLead) {
        navigate("/employee/team", { replace: true });
      } else {
        navigate("/employee", { replace: true });
      }
      return;
    }

    if (user === null) {
      savePendingReviewLeaveId(id);
      navigate("/", { replace: true });
      return;
    }

    clearPendingReviewLeaveId();
    const encodedId = encodeURIComponent(id);

    if (user.role === "admin" || user.role === "founder") {
      navigate(`/admin?leaveId=${encodedId}`, { replace: true });
    } else if (user.isVerticalLead) {
      navigate(`/employee/team?leaveId=${encodedId}`, { replace: true });
    } else {
      // Regular employee: they cannot approve leaves — redirect to their history page
      // and show a brief message so they're not confused
      toast("Only Vertical Leads can approve leave requests.", { icon: "ℹ️" });
      navigate("/employee/history", { replace: true });
    }
  }, [id, user, loading, navigate]);

  return <Loader text="Opening leave request..." />;
}
