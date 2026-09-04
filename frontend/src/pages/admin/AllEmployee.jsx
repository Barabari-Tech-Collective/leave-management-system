import { useEffect, useState } from "react";
import API from "../../api/axiosConfig";
import { useNavigate } from "react-router-dom";

export default function AllEmployee() {
  const [employees, setEmployees] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEmployees = async () => {
      const res = await API.get("/users/all");
      setEmployees(res.data);
    };

    fetchEmployees();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-textDark">All Employees</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {employees.map((emp) => (
          <div
            key={emp._id}
            onClick={() => navigate(`/admin/employee/${emp._id}`)}
            className="cursor-pointer bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition text-center"
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

            {/* <p className="mt-3 font-semibold">{emp.name}</p>
            <p className="text-sm text-gray-500">{emp.email}</p> */}
          </div>
        ))}
      </div>
    </div>
  );
}