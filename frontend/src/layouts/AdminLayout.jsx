import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-softBg font-sans text-textDark overflow-hidden select-none">
      
      {/* Sidebar Container */}
      <aside className="w-64 h-screen shrink-0 border-r border-slate-800 bg-darkBg z-30">
        <Sidebar />
      </aside>

      {/* Main Content Area - ONLY THIS SCROLLS */}
      <main className="flex-1 h-screen overflow-y-auto overflow-x-hidden p-8 z-10">
        <div className="max-w-7xl mx-auto">
        <Outlet />
        </div>
      </main>

    </div>
  );
}