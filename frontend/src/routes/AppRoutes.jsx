import { Routes, Route } from "react-router-dom";
import Login from "../pages/auth/Login";
import EmployeeLayout from "../layouts/EmployeeLayout";
import AdminLayout from "../layouts/AdminLayout";
import Dashboard from "../pages/employee/Dashboard";
import ApplyLeave from "../pages/employee/ApplyLeave";
import History from "../pages/employee/History";
import LeavePolicy from "../pages/employee/LeavePolicy";
import VerticalLeadDashboard from "../pages/verticalLead/VerticalLeadDashboard";
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminVerticalLead from "../pages/admin/AdminVerticalLead";
import EmployeeDetail from "../pages/admin/EmployeeDetail";
import ProtectedRoute from "./protectedRoutes";
import AllEmployee from "../pages/admin/AllEmployee";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<Login />} />

      {/* Employee & Vertical Lead Shared Layout */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute role="employee">
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="apply" element={<ApplyLeave />} />
        <Route path="history" element={<History />} />
        {/* NEW ROUTE: Team Dashboard for Vertical Leads */}
        <Route path="team" element={<VerticalLeadDashboard />} />
        <Route path="policy" element={<LeavePolicy />} />
      </Route>

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<AllEmployee />} />
        <Route path="vertical-leads" element={<AdminVerticalLead />} />
        <Route path="history" element={<History />} />
        <Route path="employee/:id" element={<EmployeeDetail />} />
      </Route>
    </Routes>
  );
}