import LeaveCard from "../../components/LeaveCard";
import { useEffect, useState } from "react";
import API from "../../api/axiosConfig";

export default function Dashboard() {
  const [leaveData, setLeaveData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/users/me");
        const data = res.data.leaveBalance;

        setLeaveData([
          {
            title: "Casual Leave",
            total: data?.casual?.total ?? 11,
            taken: data?.casual?.taken ?? 0
          },
          {
            title: "Sick Leave",
            total: data?.sick?.total ?? 10,
            taken: data?.sick?.taken ?? 0
          },
          {
            title: "Flexible Cultural",
            total: data?.flexible?.total ?? 5,
            taken: data?.flexible?.taken ?? 0
          },
          {
            title: "National Holidays",
            total: data?.national?.total ?? 4,
            taken: data?.national?.taken ?? 0
          }
        ]);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn p-2">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Here's a summary of your leave balances and national holiday schedule.
          </p>
        </div>
      </div>

      {/* Updated to 4 columns for large screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {leaveData.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>
    </div>
  );
}