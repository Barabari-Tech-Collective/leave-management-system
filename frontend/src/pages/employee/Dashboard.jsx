import LeaveCard from "../../components/LeaveCard";
import { useEffect, useState } from "react";
import API from "../../api/axiosConfig";

// Fixed National Holidays Schedule
const NATIONAL_HOLIDAYS_2026 = [
  { name: "Republic Day", date: new Date("2026-01-26") },
  { name: "Labour Day", date: new Date("2026-05-01") },
  { name: "Independence Day", date: new Date("2026-08-15") },
  { name: "Gandhi Jayanti", date: new Date("2026-10-02") },
];

export default function Dashboard() {
  const [leaveData, setLeaveData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get("/users/me");
        const data = res.data.leaveBalance;

        // Auto-calculate passed National Holidays based on today's date
        const today = new Date();
        const completedNationalHolidays = NATIONAL_HOLIDAYS_2026.filter(
          (h) => h.date <= today
        ).length;

        setLeaveData([
          {
            title: "Casual Leave",
            total: data?.casual?.total ?? 11,
            taken: data?.casual?.taken ?? 0,
          },
          {
            title: "Sick Leave",
            total: data?.sick?.total ?? 10,
            taken: data?.sick?.taken ?? 0,
          },
          {
            title: "Flexible Cultural",
            total: data?.flexible?.total ?? 5,
            taken: data?.flexible?.taken ?? 0,
          },
          {
            title: "National Holidays",
            total: 4,
            taken: completedNationalHolidays, // Auto-calculated (e.g. 3 completed, 1 remaining)
          },
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
            Here's a summary of your leave balances and fixed national holidays.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {leaveData.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>
    </div>
  );
}