import LeaveCard from "../../components/LeaveCard";

export default function Dashboard() {
  const leaveData = [
    { title: "Casual Leave", total: 15, taken: 5 },
    { title: "Sick Leave", total: 10, taken: 2 },
    { title: "Flexible Cultural", total: 5, taken: 0 },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-textDark dark:text-white tracking-tight drop-shadow-sm transition-colors">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-2 font-medium transition-colors">
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