import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import ProfileDropdown from "./ProfileDropdown";
import logo from "../assets/image.png";
import { useAuth } from "../context/AuthContext";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Users, 
  History, 
  BookOpen, 
  PlusCircle,
  LogOut
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const [prevPath, setPrevPath] = useState(location.pathname);

  // Close mobile menu whenever current route changes
  if (prevPath !== location.pathname) {
    setPrevPath(location.pathname);
    setMobileMenuOpen(false);
  }

  const navLinkClass = ({ isActive }) =>
    `text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? "text-primary font-bold"
        : "text-slate-600 hover:text-primary"
    }`;

  const mobileNavLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
      isActive
        ? "bg-primary/10 text-primary font-bold shadow-2xs"
        : "text-slate-700 hover:bg-slate-100"
    }`;

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-100 shadow-xs sticky top-0 z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <Link to="/employee" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
            <img
              src={logo}
              alt="Barabari Collective Logo"
              className="w-9 h-9 sm:w-10 sm:h-10 object-cover rounded-xl shadow-xs border border-gray-100 group-hover:scale-105 transition-transform"
            />
            <div className="flex flex-col">
              <span className="bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent font-extrabold text-base sm:text-xl tracking-tight leading-tight">
                Leave Management
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest hidden sm:block">
                The Barabari Collective
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-5 lg:gap-7">
            <NavLink to="/employee" end className={navLinkClass}>
              My Dashboard
            </NavLink>

            {/* CONDITIONAL LINK: Shows only for Vertical Leads */}
            {user?.isVerticalLead && (
              <NavLink to="/employee/team" className={navLinkClass}>
                Team Dashboard
              </NavLink>
            )}

            <NavLink to="/employee/history" className={navLinkClass}>
              History
            </NavLink>

            <NavLink to="/employee/policy" className={navLinkClass}>
              Policy
            </NavLink>

            <Link
              to="/employee/apply"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-primary to-indigo-600 text-white px-5 py-2 rounded-full shadow-sm shadow-primary/25 hover:shadow-md hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 text-sm font-bold"
            >
              <PlusCircle size={15} />
              <span>Apply Leave</span>
            </Link>

            <ProfileDropdown />
          </div>

          {/* Mobile Right Controls: Profile Avatar & Hamburger Toggle */}
          <div className="flex items-center gap-2 md:hidden">
            <ProfileDropdown />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-4 shadow-xl animate-fadeIn">
          {/* User Status Bar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
            <div className="truncate mr-2">
              <p className="text-xs font-bold text-slate-800 truncate">{user?.name || "Employee"}</p>
              <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md capitalize">
                {user?.vertical || "General"}
              </span>
              {user?.isVerticalLead && (
                <span className="text-[10px] font-black text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md uppercase">
                  Lead
                </span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-col gap-1.5">
            <NavLink
              to="/employee"
              end
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <LayoutDashboard size={18} />
              <span>My Dashboard</span>
            </NavLink>

            {user?.isVerticalLead && (
              <NavLink
                to="/employee/team"
                onClick={() => setMobileMenuOpen(false)}
                className={mobileNavLinkClass}
              >
                <Users size={18} />
                <span>Team Dashboard</span>
              </NavLink>
            )}

            <NavLink
              to="/employee/history"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <History size={18} />
              <span>Leave History</span>
            </NavLink>

            <NavLink
              to="/employee/policy"
              onClick={() => setMobileMenuOpen(false)}
              className={mobileNavLinkClass}
            >
              <BookOpen size={18} />
              <span>Company Leave Policy</span>
            </NavLink>
          </div>

          {/* Quick Apply Leave Button */}
          <div className="pt-1">
            <Link
              to="/employee/apply"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary to-indigo-600 text-white py-3 rounded-xl font-bold shadow-md shadow-primary/20 text-sm"
            >
              <PlusCircle size={18} />
              <span>Apply for Leave</span>
            </Link>
          </div>

          {/* Sign Out Button in Mobile Menu */}
          <div className="pt-1">
            <button
              onClick={async () => {
                setMobileMenuOpen(false);
                await logout();
              }}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 font-semibold text-xs transition cursor-pointer"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
