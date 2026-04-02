import LeaveCard from "../../components/LeaveCard";
import { useEffect, useState } from "react";
import API from "../../api/axiosConfig";


export default function Dashboard() {
  const [leaveData, setLeaveData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const res = await API.get("/users/me");

      const data = res.data.leaveBalance;

      setLeaveData([
        {
          title: "Casual Leave",
          total: data.casual.total,
          taken: data.casual.taken
        },
        {
          title: "Sick Leave",
          total: data.sick.total,
          taken: data.sick.taken
        },
        {
          title: "Flexible Cultural",
          total: data.flexible.total,
          taken: data.flexible.taken
        }
      ]);
    };

    fetchData();
  }, []);
  // const leaveData = [
  //   { title: "Casual Leave", total: 15, taken: 5 },
  //   { title: "Sick Leave", total: 10, taken: 2 },
  //   { title: "Flexible Cultural", total: 5, taken: 0 },
  // ]; Static Data


  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Here's a summary of your leave balances.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {leaveData.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>

    </div>
  );
}