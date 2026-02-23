import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, History, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const { logout } = useAuth();
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

  return (
    <div className="w-64 bg-darkBg text-slate-300 flex flex-col justify-between p-6 border-r border-slate-800 shadow-2xl relative z-10">
      <div>
        <div className="flex justify-between items-center mb-10 px-2 mt-2">
          <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
            Admin Panel
          </h2>
        </div>
        <nav className="flex flex-col gap-3">
          <NavLink
            to="/admin"
            end
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
            className={({ isActive }) =>
              `${baseStyle} ${isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"}`
            }
          >
            <div className={linkInner}>
              <History size={18} />
              Leave History
            </div>

            {pendingCount > 0 && (
              <span className="bg-accent text-xs px-2 py-1 rounded-full">
                {pendingCount}
              </span>
            )}
          </NavLink>
        </nav>
      </div>

      <div className="space-y-4">
        <div className="border-t border-slate-800"></div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full bg-slate-800/50 text-slate-300 hover:bg-accent hover:text-white hover:shadow-md hover:shadow-accent/20 py-3 rounded-xl transition-all duration-300 border border-slate-700/50 hover:border-accent group"
        >
          <LogOut size={18} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Logout</span>
        </button>

        <p className="text-xs text-slate-500 text-center font-medium">LeaveSys v1.0</p>
      </div>
    </div>
  );
}
