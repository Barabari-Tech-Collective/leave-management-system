import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function EmployeeLayout() {
  return (
    <div className="min-h-screen bg-softBg dark:bg-neutral-950 font-sans text-textDark dark:text-gray-100 selection:bg-primary/20 flex flex-col transition-colors">
      <Navbar />
      <div className="p-4 md:p-8 flex-1 max-w-7xl w-full mx-auto">
        <Outlet />
      </div>
    </div>
  );
}