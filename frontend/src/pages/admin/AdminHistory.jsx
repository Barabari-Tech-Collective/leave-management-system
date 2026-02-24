import { useState } from "react";
import StatusBadge from "../../components/StatusBadge";
import { ChevronDown, ChevronRight, Search, SearchX } from "lucide-react";

export default function AdminHistory() {
    const [openEmployee, setOpenEmployee] = useState(null);
    const [search, setSearch] = useState("");

    const employees = [
        {
            id: 1,
            name: "Bhaskar",
            history: [
                {
                    month: "Jan",
                    type: "Casual Leave",
                    days: 3,
                    status: "Approved",
                },
                {
                    month: "Feb",
                    type: "Sick Leave",
                    days: 2,
                    status: "Pending",
                },
            ],
        },
        {
            id: 2,
            name: "Anil",
            history: [
                {
                    month: "Jan",
                    type: "Casual Leave",
                    days: 1,
                    status: "Rejected",
                },
            ],
        },
    ];

    const filteredEmployees = employees.filter((employee) =>
        employee.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-10">
            <div className="flex justify-between items-center">

                <h1 className="text-3xl font-bold text-textDark dark:text-white">
                    Leave History (Hyderabad Branch)
                </h1>

                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search employee by name..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none dark:bg-neutral-900 dark:border-neutral-700 bg-white shadow-sm transition-all"
                    />
                </div>
            </div>

            {
                filteredEmployees.map((employee, index) => (
                    <div
                        key={employee.id}
                        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-md overflow-hidden"
                    >
                        {/* Employee Header */}
                        <div
                            className="flex justify-between items-center p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                            onClick={() =>
                                setOpenEmployee(
                                    openEmployee === index ? null : index
                                )
                            }
                        >
                            <div className="flex items-center gap-3">
                                {openEmployee === index ? (
                                    <ChevronDown size={18} />
                                ) : (
                                    <ChevronRight size={18} />
                                )}
                                <span className="font-semibold">
                                    {employee.name}
                                </span>
                            </div>

                            <span className="text-sm text-gray-500">
                                {employee.history.length} Records
                            </span>
                        </div>

                        {/* Expand Section */}
                        {openEmployee === index && (
                            <div className="border-t animate-fadeIn overflow-x-auto">
                                <table className="w-full text-sm min-w-[500px]">
                                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 uppercase text-xs">
                                        <tr>
                                            <th className="p-4 text-left">Month</th>
                                            <th className="p-4 text-left">Type</th>
                                            <th className="p-4 text-left">Days</th>
                                            <th className="p-4 text-left">Status</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {employee.history.map((record, idx) => (
                                            <tr
                                                key={idx}
                                                className="border-t hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                                            >
                                                <td className="p-4">{record.month}</td>
                                                <td className="p-4">{record.type}</td>
                                                <td className="p-4">{record.days}</td>
                                                <td className="p-4">
                                                    <StatusBadge status={record.status} />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                    </div>
                ))
            }
            {
                filteredEmployees.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-neutral-900 rounded-2xl shadow-sm border border-dashed border-gray-200 dark:border-neutral-700 animate-fadeIn">
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
                )
            }

        </div >
    );
}