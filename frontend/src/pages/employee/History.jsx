import StatusBadge from "../../components/StatusBadge";
import { useEffect, useState } from "react";
import API from "../../api/axiosConfig";

export default function History() {
  const [historyData, setHistoryData] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await API.get("/leave/myleaves");
      setHistoryData(res.data);
    };

    fetchHistory();
  }, []);

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

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-primary/5 transition-all duration-500">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold tracking-wider border-b border-slate-100">
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

          <tbody className="divide-y divide-slate-50">
            {historyData.map((item, index) => (
              <tr
                key={index}
                className="hover:bg-slate-50/80 transition-colors duration-200"
              >
                <td className="p-5 font-medium text-slate-700">{item.month}</td>
                <td className="p-5 text-slate-600">{item.type}</td>
                <td className="p-5 text-slate-500">{item.from}</td>
                <td className="p-5 text-slate-500">{item.to}</td>
                <td className="p-5 font-bold text-slate-700">{item.days}</td>
                <td className="p-5 text-slate-600 max-w-xs truncate">{item.reason}</td>
                <td className="p-5">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

      </div>

    </div>
  );
}