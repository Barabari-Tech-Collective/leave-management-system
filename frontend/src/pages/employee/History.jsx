import StatusBadge from "../../components/StatusBadge";
import { Inbox } from "lucide-react";

export default function History() {
  const historyData = [
    {
      month: "Jan",
      type: "Casual",
      from: "2026-01-10",
      to: "2026-01-12",
      days: 3,
      reason: "Family trip",
      status: "Approved",
    },
    {
      month: "Feb",
      type: "Sick",
      from: "2026-02-03",
      to: "2026-02-04",
      days: 2,
      reason: "Fever",
      status: "Pending",
    },
    {
      month: "Mar",
      type: "Casual",
      from: "2026-03-15",
      to: "2026-03-15",
      days: 1,
      reason: "Personal work",
      status: "Rejected",
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex justify-between items-end mb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-textDark tracking-tight drop-shadow-sm">
            Leave History
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Review your past and upcoming leave requests.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-slate-100 dark:border-neutral-800 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 overflow-x-auto">
        {historyData.length > 0 ? (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-gray-300 uppercase text-xs font-bold tracking-wider border-b border-slate-100 dark:border-neutral-700">
              <tr>
                <th className="p-5 text-left">Month</th>
                <th className="p-5 text-left">Type</th>
                <th className="p-5 text-left">From</th>
                <th className="p-5 text-left">To</th>
                <th className="p-5 text-left">Days</th>
                <th className="p-5 text-left">Reason</th>
                <th className="p-5 text-left">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-50 dark:divide-neutral-800">
              {historyData.map((item, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-50/80 dark:hover:bg-neutral-800 transition-colors duration-200"
                >
                  <td className="p-5 font-medium text-slate-700 dark:text-gray-200">{item.month}</td>
                  <td className="p-5 text-slate-600 dark:text-gray-400">{item.type}</td>
                  <td className="p-5 text-slate-500 dark:text-gray-500">{item.from}</td>
                  <td className="p-5 text-slate-500 dark:text-gray-500">{item.to}</td>
                  <td className="p-5 font-bold text-slate-700 dark:text-gray-200">{item.days}</td>
                  <td className="p-5 text-slate-600 dark:text-gray-400 max-w-xs truncate">{item.reason}</td>
                  <td className="p-5">
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center p-16 animate-fadeIn">
            <div className="w-20 h-20 bg-primary/5 dark:bg-neutral-800 text-primary dark:text-gray-400 flex items-center justify-center rounded-3xl mb-5 shadow-inner">
              <Inbox size={36} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2 mt-4">
              No leave history yet
            </h3>
            <p className="text-gray-500 text-sm max-w-sm text-center">
              When you apply for leave, your request history and status will appear here.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}