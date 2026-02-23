import { useNavigate } from "react-router-dom";
import { useState } from "react";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const employees = [
    {
      id: 1,
      name: "Bhaskar",
      email: "bhaskar@mail.com",
      casual: 5,
      sick: 2,
    },
    {
      id: 2,
      name: "Rahul",
      email: "rahul@mail.com",
      casual: 3,
      sick: 1,
    },
    {
      id: 3,
      name: "Sneha",
      email: "sneha@mail.com",
      casual: 7,
      sick: 4,
    },
  ];

  const filteredEmployees = employees.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-textDark">Admin Dashboard</h1>

        <input
          type="text"
          placeholder="Search employee..."
          className="p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="p-4 text-left">Name</th>
              <th className="p-4 text-left">Email</th>
              <th className="p-4 text-left">Casual Used</th>
              <th className="p-4 text-left">Sick Used</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="border-t hover:bg-gray-50 transition">
                <td className="p-4 font-medium">{emp.name}</td>
                <td className="p-4">{emp.email}</td>
                <td className="p-4">{emp.casual}</td>
                <td className="p-4">{emp.sick}</td>
                <td className="p-4">
                  <button
                    onClick={() => navigate(`/admin/employee/${emp.id}`)}
                    className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 transition"
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
