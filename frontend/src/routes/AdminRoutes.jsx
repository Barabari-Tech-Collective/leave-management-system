import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function AdminRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading || user === undefined) return null;

  if (user === null || user.role !== "admin") {
    return <Navigate to="/employee" />;
  }

  return children;
}