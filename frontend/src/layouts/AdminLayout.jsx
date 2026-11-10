import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { Menu, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Automatically close mobile sidebar on navigation
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setSidebarOpen(false);
  }

  return (
    <div className="fixed inset-0 flex h-full w-full bg-softBg font-sans text-textDark overflow-hidden select-none">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container - Reduced width on desktop to maximize table space */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-56 md:static md:translate-x-0 transition-transform duration-300 ease-in-out shrink-0 border-r border-slate-800 bg-darkBg ${
          sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        {/* Mobile Top Navigation Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 z-30 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Open sidebar navigation"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-base">
                Admin Panel
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">
                {user?.role || "Admin"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 truncate max-w-[120px]">
              {user?.name || "Admin"}
            </span>
          </div>
        </header>

        {/* Scrollable Main Content - Fits viewport with no unwanted vertical scroll */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-5 lg:p-6 min-h-0">
          <div className="w-full max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
