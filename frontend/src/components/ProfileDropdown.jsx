import { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleEsc(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-primary/30 hover:ring-4 hover:ring-primary/20 transition-all duration-300 font-bold text-lg focus:outline-none"
      >
        {user?.email?.charAt(0).toUpperCase() || "E"}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-2xl border border-slate-100 dark:border-neutral-800 rounded-3xl shadow-2xl p-6 space-y-5 animate-dropdown z-50 transition-colors">
          <div className="pb-2 border-b border-slate-50 dark:border-neutral-800">
            <p className="font-bold text-slate-800 dark:text-white text-lg tracking-tight truncate">
              {user?.email || "employee@leavesys.com"}
            </p>
            <p className="text-sm font-medium text-primary mt-0.5 capitalize bg-primary/10 dark:bg-primary/20 inline-block px-2 py-0.5 rounded-md">
              {user?.role || "Employee"} Role
            </p>
          </div>

          <div className="space-y-3 text-sm font-medium text-slate-600 dark:text-slate-400">
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
              <span>Casual Leaves</span>
              <span className="font-bold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-md">10</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
              <span>Sick Leaves</span>
              <span className="font-bold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-md">8</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
              <span>Flexible</span>
              <span className="font-bold text-primary bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded-md">5</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full bg-slate-50 dark:bg-neutral-800 text-accent font-bold py-3 rounded-xl hover:bg-accent hover:text-white transition-all duration-300 border border-slate-100 dark:border-neutral-700 hover:border-accent hover:shadow-lg hover:shadow-accent/20"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
