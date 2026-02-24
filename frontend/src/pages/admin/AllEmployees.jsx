import { useNavigate } from "react-router-dom";

export default function AdminEmployees() {
    const navigate = useNavigate();

    const branch = {
        name: "Hyderabad",
        manager: {
            id: 100,
            name: "Ramesh Kumar",
            role: "Branch Manager",
        },
        team: [
            { id: 1, name: "Bhaskar", role: "Frontend Dev", total: 15, taken: 5 },
            { id: 2, name: "Anil", role: "Backend Dev", total: 15, taken: 10 },
            { id: 3, name: "Sneha", role: "UI Designer", total: 15, taken: 3 },
            { id: 4, name: "Rahul", role: "QA Engineer", total: 15, taken: 8 },
        ],
    };

    return (
        <div className="space-y-20">

            <h1 className="text-3xl font-bold text-textDark dark:text-white text-center">
                {branch.name} Branch
            </h1>

            {/* Manager */}
            <div className="flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-primary text-white flex items-center justify-center text-4xl font-bold shadow-xl">
                    {branch.manager.name.charAt(0)}
                </div>

                <div className="text-center mt-4">
                    <p className="text-lg font-semibold">
                        {branch.manager.name}
                    </p>
                    <p className="text-sm text-gray-500">
                        {branch.manager.role}
                    </p>
                </div>
            </div>

            {/* Employees */}
            <div className="flex flex-wrap justify-center gap-16">

                {branch.team.map((employee) => {
                    const remaining = employee.total - employee.taken;
                    const percent = (remaining / employee.total) * 100;

                    return (
                        <div
                            key={employee.id}
                            onClick={() => navigate(`/admin/employee/${employee.id}`)}
                            className="relative flex flex-col items-center cursor-pointer group"
                        >
                            {/* Leave Ring */}
                            <div
                                className="relative w-24 h-24 rounded-full flex items-center justify-center"
                                style={{
                                    background: `conic-gradient(#658CEA ${((employee.total - employee.taken) / employee.total) * 100
                                        }%, #e5e7eb ${((employee.total - employee.taken) / employee.total) * 100
                                        }%)`,
                                }}
                            >
                                <div className="w-20 h-20 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition">
                                    <span className="text-xl font-semibold">
                                        {employee.name.charAt(0)}
                                    </span>
                                </div>
                            </div>

                            {/* Tooltip */}
                            <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black text-white text-xs px-4 py-2 rounded-xl shadow-lg pointer-events-none">
                                <p className="font-medium">
                                    Remaining: {employee.total - employee.taken}
                                </p>
                                <p className="text-gray-300">
                                    Used: {employee.taken} / {employee.total}
                                </p>
                            </div>

                            <div className="text-center mt-3">
                                <p className="font-medium text-sm">
                                    {employee.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {employee.role}
                                </p>
                            </div>
                        </div>
                    );
                })}

            </div>

        </div>
    )
}