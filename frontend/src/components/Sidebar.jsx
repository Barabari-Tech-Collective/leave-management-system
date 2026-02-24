import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, History, LogOut, X, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar({ isOpen, setIsOpen }) {
  const { logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const pendingCount = 2; // Later from API

  const baseStyle =
    "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-medium group";

  const linkInner = "flex items-center gap-3";

  const activeStyle = "bg-primary/10 text-primary font-semibold shadow-[absolute_inset_0_0_10px_rgba(79,70,229,0.1)]";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const closeSidebar = () => {
    if (setIsOpen) setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 backdrop-blur-sm ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={closeSidebar}
      />

      {/* Sidebar Content */}
      <div className={`fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-darkBg text-slate-300 flex flex-col justify-between p-6 border-r border-slate-800 shadow-2xl transform ${isOpen ? "translate-x-0" : "-translate-x-full"} md:relative md:translate-x-0 transition-transform duration-300 ease-in-out`}>
        <div>
          <div className="flex justify-between items-center mb-10 px-2 mt-2">
            <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
              Admin Panel
            </h2>
            <button
              onClick={closeSidebar}
              className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex flex-col gap-3">
            <NavLink
              to="/admin"
              end
              onClick={closeSidebar}
              className={({ isActive }) =>
                `${baseStyle} ${isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"}`
              }
            >
              <div className={linkInner}>
                <LayoutDashboard size={18} />
                Dashboard
              </div>
            </NavLink>

            <NavLink
              to="/admin/employees"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `${baseStyle} ${isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"}`
              }
            >
              <div className={linkInner}>
                <Users size={18} />
                All Employees
              </div>
            </NavLink>

            <NavLink
              to="/admin/history"
              onClick={closeSidebar}
              className={({ isActive }) =>
                `${baseStyle} ${isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"}`
              }
            >
              <div className={linkInner}>
                <History size={18} />
                Leave History
              </div>

              {pendingCount > 0 && (
                <span className="bg-accent text-xs px-2 py-1 rounded-full text-white font-bold">
                  {pendingCount}
                </span>
              )}
            </NavLink>
          </nav>
        </div>

        <div className="space-y-4">
          <div className="border-t border-slate-800"></div>

          <div className="flex justify-between items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-3 bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all border border-slate-700/50"
              aria-label="Toggle Theme"
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-800/50 text-slate-300 hover:bg-accent hover:text-white hover:shadow-md hover:shadow-accent/20 py-3 rounded-xl transition-all duration-300 border border-slate-700/50 hover:border-accent group"
            >
              <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
              <span className="font-medium">Logout</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 text-center font-medium mt-4">LeaveSys v1.0</p>
        </div>
      </div>
    </>
  );
}
