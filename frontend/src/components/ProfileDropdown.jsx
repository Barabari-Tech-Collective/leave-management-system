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
        className="w-11 h-11 rounded-full bg-linear-to-br from-primary to-indigo-600 text-white flex items-center justify-center cursor-pointer hover:shadow-lg hover:shadow-primary/30 hover:ring-4 hover:ring-primary/20 transition-all duration-300 font-bold text-lg focus:outline-none"
      >
        {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || "E"}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-white/90 backdrop-blur-2xl border border-slate-100 rounded-3xl shadow-2xl p-6 space-y-5 animate-dropdown z-50">
          <div className="pb-3 border-b border-slate-100 space-y-1">
            <p className="font-extrabold text-slate-800 text-base tracking-tight truncate">
              {user?.name || "Employee"}
            </p>
            <p className="text-xs text-slate-500 font-medium truncate">
              {user?.email}
            </p>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md capitalize">
                {user?.vertical || "None"} Vertical
              </span>
              <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md capitalize">
                {user?.isVerticalLead ? "Vertical Lead" : user?.jobRole || "Employee"}
              </span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleLogout}
              className="w-full bg-slate-50 text-accent font-bold py-3 rounded-xl hover:bg-accent hover:text-white transition-all duration-300 border border-slate-100 hover:border-accent hover:shadow-lg hover:shadow-accent/20 cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}