import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Search, SearchX } from "lucide-react";

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
        <h1 className="text-3xl font-bold text-textDark dark:text-white">Admin Dashboard</h1>

        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search employee by name..."
            className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-neutral-900 dark:border-neutral-700 bg-white shadow-sm transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-md overflow-hidden transition-colors overflow-x-auto">
        {filteredEmployees.length > 0 ? (
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Casual Used</th>
                <th className="p-4 text-left">Sick Used</th>
                <th className="p-4 text-left">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition duration-200">
                  <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{emp.name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{emp.email}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{emp.casual}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{emp.sick}</td>
                  <td className="p-4">
                    <button
                      onClick={() => navigate(`/admin/employee/${emp.id}`)}
                      className="bg-primary text-white px-4 py-2 rounded-xl hover:scale-105 transition shadow-sm hover:shadow-primary/30"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-neutral-900 rounded-2xl">
            <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-800 text-gray-400 flex items-center justify-center rounded-2xl mb-4 shadow-inner">
              <SearchX size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">
              No employees found
            </h3>
            <p className="text-gray-500 text-sm">
              We couldn't find anyone matching "{search}".
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
