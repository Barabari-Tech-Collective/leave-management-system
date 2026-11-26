import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { clearPendingReviewLeaveId } from "../utils/reviewRedirect";

export default function EmployeeLayout() {
  const { user } = useAuth();

  // Clear stale deep-link IDs if a non-approver employee logs in after clicking an email link
  useEffect(() => {
    if (user && !user.isVerticalLead && user.role !== "admin" && user.role !== "founder") {
      clearPendingReviewLeaveId();
    }
  }, [user]);
  return (
    <div className="min-h-screen bg-softBg font-sans text-textDark selection:bg-primary/20 flex flex-col">
      <Navbar />
      <main className="p-3 sm:p-6 lg:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}