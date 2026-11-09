import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  // Auth verification in progress: display centered spinner
  if (loading || user === undefined) {
    return <Loader text="Verifying session..." />;
  }

  // Confirmed not logged in
  if (user === null) {
    return <Navigate to="/" replace />;
  }

  // Role check: Admins and Founders have administrative access and can also access employee features
  if (role) {
    if (role === "admin" && (user.role === "admin" || user.role === "founder")) {
      return children;
    }
    if (role === "employee" && (user.role === "employee" || user.isVerticalLead || user.role === "admin" || user.role === "founder")) {
      return children;
    }
    if (user.role !== role) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
