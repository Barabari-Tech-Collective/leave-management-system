import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import API from "../../api/axiosConfig";

const VERTICALS = ["All", "Program", "Placement", "EdTech", "Operations", "None"];

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [selectedVertical, setSelectedVertical] = useState("All");
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
  const fetchEmployees = async () => {
    const res = await API.get("/users/all");
    setEmployees(res.data);
  };

  fetchEmployees();
}, []);

  // Filter by search name AND vertical category
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.name.toLowerCase().includes(search.toLowerCase());
    const matchesVertical =
      selectedVertical === "All" || (emp.vertical || "None") === selectedVertical;
    return matchesSearch && matchesVertical;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textDark">Admin Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
        {/* Vertical Filter Dropdown */}
          <select
            value={selectedVertical}
            onChange={(e) => setSelectedVertical(e.target.value)}
            className="p-3 border rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary shadow-sm"
          >
            {VERTICALS.map((v) => (
              <option key={v} value={v}>
                {v === "All" ? "All Verticals" : `${v} Vertical`}
              </option>
            ))}
          </select>
        <input
          type="text"
          placeholder="Search employee..."
          className="p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      </div>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Vertical</th>
              <th className="p-4 text-left">Casual Used</th>
              <th className="p-4 text-left">Sick Used</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center p-6 text-gray-400">
                  No employees found matching filter criteria.
                </td>
              </tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp._id} className="border-t hover:bg-gray-50 transition">
                  <td className="p-4 font-medium">{emp.name}</td>
                  <td className="p-4 text-gray-500">{emp.email}</td>
                  <td className="p-4 font-semibold text-indigo-600">
                    {emp.vertical || "None"}
                  </td>
                  <td className="p-4">{emp.leaveBalance?.casual?.taken ?? 0}</td>
                  <td className="p-4">{emp.leaveBalance?.sick?.taken ?? 0}</td>
                  <td className="p-4">
                    <button
                      onClick={() => navigate(`/admin/employee/${emp._id}`)}
                      className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 transition text-xs font-medium"
                    >
                      View Details
                    </button>
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
