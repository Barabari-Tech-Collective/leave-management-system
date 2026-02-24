import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useState } from "react";
import { Menu } from "lucide-react";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-softBg dark:bg-neutral-950 font-sans text-textDark dark:text-gray-100 selection:bg-primary/20 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border-b border-gray-100 dark:border-neutral-800 shadow-sm z-30">
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent tracking-tight">
            LeaveSys
          </h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 active:scale-95 transition-all"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Main Content Scroll Area */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}