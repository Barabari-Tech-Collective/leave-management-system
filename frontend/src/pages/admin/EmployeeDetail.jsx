import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import StatusBadge from "../../components/StatusBadge";
import API from "../../api/axiosConfig";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [totalLeaves, setTotalLeaves] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await API.get(`/leave/employee/${id}`);
        setHistory(res.data.leaves || []);
        
        // Populate balances
        if (res.data.leaveBalance) {
          setTotalLeaves([
            { title: "Casual Leave", total: res.data.leaveBalance.casual.total, taken: res.data.leaveBalance.casual.taken },
            { title: "Sick Leave", total: res.data.leaveBalance.sick.total, taken: res.data.leaveBalance.sick.taken },
            { title: "Flexible Leave", total: res.data.leaveBalance.flexible.total, taken: res.data.leaveBalance.flexible.taken },
          ]);
        }
      } catch (err) {
        console.error("Error fetching employee details:", err);
      }
    };

    fetchLeaves();
  }, [id]);

  return (
    <div className="space-y-7">
      <h1 className="text-3xl font-bold text-textDark">Employee Details (Read-Only)</h1>

      <div className="grid md:grid-cols-3 gap-6">
        {totalLeaves.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Month</th>
              <th className="p-4 text-left">Type</th>
              <th className="p-4 text-left">Days</th>
              <th className="p-4 text-left">From</th>
              <th className="p-4 text-left">To</th>
              <th className="p-4 text-left">Reason</th>
              <th className="p-4 text-left">Status</th>
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
                  <td className="p-4">{item.month}</td>
                  <td className="p-4 capitalize">{item.type}</td>
                  <td className="p-4 font-semibold">{item.days}</td>
                  <td className="p-4">{item.from}</td>
                  <td className="p-4">{item.to}</td>
                  <td className="p-4 max-w-xs truncate">{item.reason}</td>
                  <td className="p-4">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}