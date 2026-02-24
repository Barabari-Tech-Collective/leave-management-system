import { Link } from "react-router-dom";
import ProfileDropdown from "./ProfileDropdown";
import logo from "../assets/image.png";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();

  return (
    <nav className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur-xl border-b border-gray-100 dark:border-neutral-800 shadow-sm px-4 md:px-8 py-3 md:py-4 flex flex-col md:flex-row justify-between items-center gap-4 sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center justify-center gap-3 p-1 md:p-2 text-xl font-extrabold text-textDark dark:text-white tracking-tight">
        <img
          src={logo}
          alt="logo"
          className="w-10 h-10 object-cover rounded-xl shadow-sm border border-gray-100"
        />
        <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
          Leave Management
        </span>
      </div>

      <div className="flex flex-wrap justify-center items-center gap-3 md:gap-8 font-medium text-sm md:text-base">
        {user ? (
          <>
            <Link
              to="/employee"
              className="text-slate-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200"
            >
              Dashboard
            </Link>

            <Link
              to="/employee/history"
              className="text-slate-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200"
            >
              History
            </Link>

            <Link
              to="/employee/apply"
              className="bg-gradient-to-r from-primary to-indigo-500 text-white px-6 py-2.5 rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 font-semibold"
            >
              Apply Leave
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <ProfileDropdown />
          </>
        ) : (
          <>
            <Link
              to="/"
              className="text-slate-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors duration-200 font-semibold"
            >
              Login
            </Link>

            <Link
              to="/signup"
              className="bg-gradient-to-r from-primary to-indigo-500 text-white px-5 sm:px-6 py-2 sm:py-2.5 rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 font-semibold text-sm sm:text-base"
            >
              Sign Up
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-600 dark:text-gray-300 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
