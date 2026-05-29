import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, role }) {

  const { user, loading } = useAuth();

  // auth still loading
  if (loading || user === undefined) {
    return <div>Loading...</div>;
  }

  // confirmed not logged in
  if (user === null) {
    return <Navigate to="/" replace />;
  }

  // role mismatch
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// export default function ProtectedRoute({ children, role }) {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return <div>Loading...</div>
//   }


//   if (!user) {
//     return <Navigate to="/" />;
//   }

//   if (role && user.role !== role) {
//     return <Navigate to="/" />;
//   }

//   return children;
// }