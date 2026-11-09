import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import StatusBadge from "../../components/StatusBadge";
import API from "../../api/axiosConfig";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employeeName, setEmployeeName] = useState("");
  const [totalLeaves, setTotalLeaves] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await API.get(`/leave/employee/${id}`);
        
        // Extract data cleanly from response object
        const leaveList = res.data.leaves || [];
        const balances = res.data.leaveBalance;

        if (res.data.employee?.name) {
          setEmployeeName(res.data.employee.name);
        }

        setHistory(leaveList);

        if (balances) {
          setTotalLeaves([
            { title: "Casual Leave", total: balances.casual?.total ?? 11, taken: balances.casual?.taken ?? 0 },
            { title: "Sick Leave", total: balances.sick?.total ?? 10, taken: balances.sick?.taken ?? 0 },
            { title: "Flexible Leave", total: balances.flexible?.total ?? 5, taken: balances.flexible?.taken ?? 0 },
          ]);
        }
      } catch (err) {
        console.error("Error fetching employee details:", err);
      }
    };

    fetchLeaves();
  }, [id]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <h1 className="text-2xl sm:text-3xl font-bold text-textDark">
        {employeeName ? `${employeeName}'s Details` : "Employee Details"}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
        {totalLeaves.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[11px] sm:text-xs">
              <tr>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">Month</th>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">Type</th>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">Days</th>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">From</th>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">To</th>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">Reason</th>
                <th className="p-3 sm:p-4 text-left whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-6 text-gray-400">
                    No leave history found
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item._id} className="border-t hover:bg-gray-50 transition">
                    <td className="p-3 sm:p-4 whitespace-nowrap">{item.month}</td>
                    <td className="p-3 sm:p-4 capitalize whitespace-nowrap">{item.type}</td>
                    <td className="p-3 sm:p-4 font-semibold whitespace-nowrap">{item.days}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">{item.from}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">{item.to}</td>
                    <td className="p-3 sm:p-4 max-w-xs truncate">{item.reason}</td>
                    <td className="p-3 sm:p-4 whitespace-nowrap">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}