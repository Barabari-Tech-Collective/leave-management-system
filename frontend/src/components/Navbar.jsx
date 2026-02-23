import { Link } from "react-router-dom";
import ProfileDropdown from "./ProfileDropdown";
import logo from "../assets/image.png";

export default function Navbar() {
  return (
    <nav className="bg-white/70 backdrop-blur-xl border-b border-gray-100 shadow-sm px-8 py-4 flex justify-between items-center sticky top-0 z-50 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-center gap-3 p-2 text-xl font-extrabold text-textDark tracking-tight">
        <img
          src={logo}
          alt="logo"
          className="w-10 h-10 object-cover rounded-xl shadow-sm border border-gray-100"
        />
        <span className="bg-gradient-to-r from-primary to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
          Leave Management
        </span>
      </div>

      <div className="flex items-center gap-8 font-medium">
        <Link
          to="/employee"
          className="text-slate-600 hover:text-primary transition-colors duration-200"
        >
          Dashboard
        </Link>

        <Link
          to="/employee/history"
          className="text-slate-600 hover:text-primary transition-colors duration-200"
        >
          History
        </Link>

        <Link
          to="/employee/apply"
          className="bg-gradient-to-r from-primary to-indigo-500 text-white px-6 py-2.5 rounded-full shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 font-semibold"
        >
          Apply Leave
        </Link>

        <ProfileDropdown />
      </div>
    </nav>
  );
}
