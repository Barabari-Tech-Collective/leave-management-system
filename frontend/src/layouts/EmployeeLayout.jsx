import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";

export default function EmployeeLayout() {
  return (
    <div className="min-h-screen bg-softBg font-sans text-textDark selection:bg-primary/20 flex flex-col">
      <Navbar />
      <main className="p-3 sm:p-6 lg:p-8 flex-1 overflow-y-auto max-w-7xl w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
}