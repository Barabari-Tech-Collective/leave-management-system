// src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Layers, Users, LogOut, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({ onClose }) {
  const { logout } = useAuth();

  const baseStyle =
    "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 font-medium group text-sm";

  const linkInner = "flex items-center gap-3";

  const activeStyle =
    "bg-primary/10 text-primary font-semibold shadow-[absolute_inset_0_0_10px_rgba(79,70,229,0.1)]";

  const handleLogout = async () => {
    onClose?.();
    await logout();
  };

  return (
    <div className="w-full h-full bg-darkBg text-slate-300 flex flex-col justify-between p-5 sm:p-6 border-r border-slate-800 shadow-2xl relative z-10 overflow-y-auto">
      <div>
        {/* Header with Title and Mobile Close Button */}
        <div className="flex justify-between items-center mb-8 px-2 mt-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent">
              Admin Panel
            </h2>
            <p className="text-[11px] font-medium text-slate-500">The Barabari Collective</p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-2.5">
          <NavLink
            to="/admin"
            end
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `${baseStyle} ${
                isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <div className={linkInner}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/employees"
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `${baseStyle} ${
                isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <div className={linkInner}>
              <Users size={18} />
              <span>All Employees</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/vertical-leads"
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `${baseStyle} ${
                isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <div className={linkInner}>
              <Users size={18} />
              <span>Manage Vertical Leads</span>
            </div>
          </NavLink>

          <NavLink
            to="/admin/verticals"
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `${baseStyle} ${
                isActive ? activeStyle : "hover:bg-slate-800 hover:text-white"
              }`
            }
          >
            <div className={linkInner}>
              <Layers size={18} />
              <span>Manage Verticals</span>
            </div>
          </NavLink>
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="space-y-4 pt-6">
        <div className="border-t border-slate-800"></div>

        <button
          onClick={handleLogout}
          className="flex items-center justify-center gap-2 w-full bg-slate-800/50 text-slate-300 hover:bg-accent hover:text-white hover:shadow-md hover:shadow-accent/20 py-3 rounded-xl transition-all duration-300 border border-slate-700/50 hover:border-accent group cursor-pointer text-sm"
        >
          <LogOut
            size={18}
            className="transition-transform group-hover:-translate-x-1"
          />
          <span className="font-semibold">Logout</span>
        </button>

        <p className="text-[11px] text-slate-500 text-center font-medium">
          LeaveSys v1.0
        </p>
      </div>
    </div>
  );
}
