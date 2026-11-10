import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LeaveCard from "../../components/LeaveCard";
import StatusBadge from "../../components/StatusBadge";
import YearSelect from "../../components/YearSelect";
import API from "../../api/axiosConfig";

export default function EmployeeDetail() {
  const { id } = useParams();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [availableYears, setAvailableYears] = useState([currentYear + 1, currentYear]);
  const [employeeName, setEmployeeName] = useState("");
  const [totalLeaves, setTotalLeaves] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedYear) params.append("year", selectedYear);
        const res = await API.get(`/leave/employee/${id}?${params.toString()}`);
        
        // Extract data cleanly from response object
        const leaveList = res.data.leaves || [];
        const balances = res.data.leaveBalance;

        if (res.data.employee?.name) {
          setEmployeeName(res.data.employee.name);
        }
        if (res.data.availableYears) {
          setAvailableYears(res.data.availableYears);
        }

        setHistory(leaveList);

        if (balances) {
          setTotalLeaves([
            { title: "Casual Leave", total: balances.casual?.total ?? 11, taken: balances.casual?.taken ?? 0 },
            { title: "Sick Leave", total: balances.sick?.total ?? 10, taken: balances.sick?.taken ?? 0 },
            { title: "Flexible Leave", total: balances.flexible?.total ?? 5, taken: balances.flexible?.taken ?? 0 },
            { title: "Extra Leaves", total: null, taken: balances.extra?.taken ?? 0, isCounterOnly: true, badgeText: "Extra Leave" }
          ]);
        }
      } catch (err) {
        console.error("Error fetching employee details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [id, selectedYear]);

  return (
    <div className="space-y-6 sm:space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4 border-slate-100">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-textDark">
            {employeeName ? `${employeeName}'s Details` : "Employee Details"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Viewing leave balances and applications for calendar year {selectedYear}
          </p>
        </div>

        {/* Year Filter Dropdown */}
        <YearSelect
          id="admin-emp-year"
          value={selectedYear}
          onChange={setSelectedYear}
          availableYears={availableYears}
          disabled={loading}
          label="Year:"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {totalLeaves.map((leave, index) => (
          <LeaveCard key={index} {...leave} />
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left table-auto border-collapse">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sm:text-[11px] font-bold border-b border-slate-100 tracking-wider">
              <tr>
                <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 whitespace-nowrap">Month</th>
                <th className="py-2.5 px-2 sm:py-3 sm:px-3 whitespace-nowrap">Type</th>
                <th className="py-2.5 px-2 sm:py-3 sm:px-2 whitespace-nowrap text-center">Days</th>
                <th className="py-2.5 px-2 sm:py-3 sm:px-3 whitespace-nowrap">From</th>
                <th className="py-2.5 px-2 sm:py-3 sm:px-3 whitespace-nowrap">To</th>
                <th className="py-2.5 px-3 sm:py-3 sm:px-4">Reason</th>
                <th className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-slate-400 text-xs">
                    No leave history found
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 sm:py-3 sm:px-3.5 whitespace-nowrap font-medium text-slate-600">{item.month}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-3 capitalize whitespace-nowrap font-semibold text-slate-800">
                      {item.type === "extra" ? "Extra Leave" : item.type}
                    </td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-2 font-bold text-slate-800 whitespace-nowrap text-center">{item.days}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-3 whitespace-nowrap text-slate-600">{item.from}</td>
                    <td className="py-2.5 px-2 sm:py-3 sm:px-3 whitespace-nowrap text-slate-600">{item.to}</td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-4 max-w-xs truncate text-slate-600" title={item.reason}>
                      {item.reason || <span className="text-slate-400 italic">No reason provided</span>}
                    </td>
                    <td className="py-2.5 px-3 sm:py-3 sm:px-3.5 text-right whitespace-nowrap">
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