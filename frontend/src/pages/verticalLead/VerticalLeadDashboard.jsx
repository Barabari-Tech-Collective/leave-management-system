import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_URL || "https://leave-portal-api.barabaricollective.org";

export default function VerticalLeadDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dashboardData, setDashboardData] = useState({
    vertical: "",
    totalTeamMembers: 0,
    teamMembers: [],
    teamLeaves: []
  });
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/leave/team-dashboard`, {
        withCredentials: true
      });
      setDashboardData(res.data);
      setError("");
    } catch (err) {
      console.error("Error fetching lead dashboard:", err);
      setError(err.response?.data?.message || "Failed to load vertical dashboard.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Approve / Reject Actions
  const handleStatusUpdate = async (leaveId, status) => {
    try {
      setActionLoading(leaveId);
      await axios.put(
        `${API_BASE_URL}/leave/update-status/${leaveId}`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Leave ${status} successfully!`);
      // Refresh dashboard to reflect updated status and balances
      await fetchDashboardData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update leave status.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center">
        <h3 className="font-bold text-lg mb-2">Access Limited</h3>
        <p>{error}</p>
      </div>
    );
  }

  const pendingLeaves = dashboardData.teamLeaves.filter((l) => l.status === "pending");
  const approvedLeaves = dashboardData.teamLeaves.filter((l) => l.status === "approved");

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {dashboardData.vertical} Vertical Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Overview of team leave balance and approval requests.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            className="mt-4 md:mt-0 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-50 text-sm font-medium transition"
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Stats Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Team Strength
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-1">
                {dashboardData.totalTeamMembers}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg text-xl">👥</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Pending Requests
              </p>
              <h3 className="text-3xl font-bold text-amber-600 mt-1">
                {pendingLeaves.length}
              </h3>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg text-xl">⏳</div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Approved Leaves
              </p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-1">
                {approvedLeaves.length}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg text-xl">✅</div>
          </div>
        </div>

        {/* Section 1: Team Leave Applications */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Team Leave Requests</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              {dashboardData.teamLeaves.length} Total
            </span>
          </div>

          {dashboardData.teamLeaves.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No leave applications found for this team.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
                    <th className="py-3 px-6">Employee</th>
                    <th className="py-3 px-6">Type</th>
                    <th className="py-3 px-6">Dates</th>
                    <th className="py-3 px-6">Days</th>
                    <th className="py-3 px-6">Reason</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {dashboardData.teamLeaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-gray-50/50 transition">
                      <td className="py-4 px-6 font-medium text-gray-900">
                        {leave.user?.name || "Unknown"}
                        <div className="text-xs text-gray-400 font-normal">{leave.user?.email}</div>
                      </td>
                      <td className="py-4 px-6 capitalize font-semibold text-gray-700">
                        {leave.type}
                      </td>
                      <td className="py-4 px-6 text-gray-600 whitespace-nowrap">
                        {new Date(leave.fromDate).toLocaleDateString("en-GB")} -{" "}
                        {new Date(leave.toDate).toLocaleDateString("en-GB")}
                      </td>
                      <td className="py-4 px-6 font-semibold text-gray-800">{leave.days}</td>
                      <td className="py-4 px-6 text-gray-600 max-w-xs truncate">{leave.reason}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                            leave.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : leave.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {leave.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                        {leave.status === "pending" ? (
                          <>
                            <button
                              disabled={actionLoading === leave._id}
                              onClick={() => handleStatusUpdate(leave._id, "approved")}
                              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-md hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              disabled={actionLoading === leave._id}
                              onClick={() => handleStatusUpdate(leave._id, "rejected")}
                              className="px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-md hover:bg-rose-700 transition disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No action needed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Team Member Leave Balance Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">Team Members Leave Balances</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboardData.teamMembers.map((member) => (
              <div key={member._id} className="p-4 rounded-lg border border-gray-100 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900">{member.name}</h4>
                  {member.isVerticalLead && (
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                      LEAD
                    </span>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded border border-gray-100">
                    <p className="text-gray-400 font-medium">Casual</p>
                    <p className="font-bold text-gray-800 mt-1">
                      {member.leaveBalance?.casual?.taken} / {member.leaveBalance?.casual?.total}
                    </p>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-100">
                    <p className="text-gray-400 font-medium">Sick</p>
                    <p className="font-bold text-gray-800 mt-1">
                      {member.leaveBalance?.sick?.taken} / {member.leaveBalance?.sick?.total}
                    </p>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-100">
                    <p className="text-gray-400 font-medium">Flexible</p>
                    <p className="font-bold text-gray-800 mt-1">
                      {member.leaveBalance?.flexible?.taken} / {member.leaveBalance?.flexible?.total}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}