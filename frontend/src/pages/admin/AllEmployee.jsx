import { useEffect, useState } from "react";
import API from "../../api/axiosConfig";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

export default function AllEmployee() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        const res = await API.get("/users/all");
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error("Error fetching employees:", err);
        toast.error("Failed to load employee list");
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6 animate-fadeIn pb-2">
      <h1 className="text-2xl sm:text-3xl font-bold text-textDark">All Employees</h1>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-semibold">Loading employees...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-100">
          No employees found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {employees.map((emp) => (
            <div
              key={emp._id}
              onClick={() => navigate(`/admin/employee/${emp._id}`)}
              className="cursor-pointer bg-white p-5 sm:p-6 rounded-2xl shadow-sm hover:shadow-xl transition text-center border border-slate-100"
            >
              {/* Circle Avatar */}
              <div className="w-16 h-16 mx-auto rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold">
                {emp.name?.charAt(0).toUpperCase()}
              </div>
              <div className="mt-4 w-full space-y-1">
                <p className="font-bold text-slate-800 text-base truncate w-full" title={emp.name}>
                  {emp.name}
                </p>

                {/* Fixed Email Overflow with truncate and title tooltip */}
                <p className="text-xs text-slate-500 font-medium truncate w-full px-1" title={emp.email}>
                  {emp.email}
                </p>

                <span className="inline-block mt-2 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {emp.vertical || "None"} Vertical
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
