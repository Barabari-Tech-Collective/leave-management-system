import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown } from "lucide-react";
import Spinner from "../../components/Spinner";
import Navbar from "../../components/Navbar";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("employee");

  const handleLogin = (e) => {
    e.preventDefault();

    login(email, role);

    if (role === "admin") {
      navigate("/admin");
    } else {
      navigate("/employee");
    }
  };

  const handleGoogleLogin = () => {
    // Simulated Google response
    const fakeGoogleUser = {
      email: "googleuser@gmail.com",
    };

    // Example: Auto-detect admin if email contains admin
    const role = fakeGoogleUser.email.includes("admin")
      ? "admin"
      : "employee";

    login(fakeGoogleUser.email, role);

    navigate(role === "admin" ? "/admin" : "/employee");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/20 via-white to-accent/20 dark:from-primary/10 dark:via-neutral-950 dark:to-accent/10 transition-colors">
      <Navbar />
      <div className="flex-1 px-4 py-8 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-neutral-900 p-6 md:p-10 rounded-2xl shadow-xl w-full max-w-md space-y-6 border border-transparent dark:border-neutral-800 transition-colors"
        >
          <h2 className="text-2xl font-bold text-center text-textDark dark:text-white">Login</h2>

          <input
            type="email"
            placeholder="example@gmail.com"
            required
            className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-neutral-800 dark:text-white transition-colors"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <div className="relative">
            <select
              className="w-full appearance-none p-3 pr-10 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-neutral-800 dark:text-white cursor-pointer transition-colors"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={20}
            />
          </div>

          <button className="w-full bg-primary text-white py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-neutral-900">
            Login
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 text-gray-400 dark:text-gray-500 text-sm">
            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800"></div>
            OR
            <div className="flex-1 h-px bg-gray-200 dark:bg-neutral-800"></div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 py-3 rounded-xl shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all duration-200"
          >
            {/* Google G Logo */}
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path
                fill="#4285F4"
                d="M24 9.5c3.54 0 6.72 1.22 9.22 3.61l6.9-6.9C35.91 2.3 30.34 0 24 0 14.82 0 6.87 5.48 2.95 13.44l8.03 6.23C12.9 13.2 17.98 9.5 24 9.5z"
              />
              <path
                fill="#34A853"
                d="M46.5 24c0-1.64-.15-3.21-.43-4.72H24v9.03h12.7c-.55 2.95-2.23 5.46-4.75 7.14l7.3 5.68C43.89 37.26 46.5 31.1 46.5 24z"
              />
              <path
                fill="#FBBC05"
                d="M10.98 28.23a14.52 14.52 0 010-8.46l-8.03-6.23A23.93 23.93 0 000 24c0 3.87.93 7.53 2.95 10.46l8.03-6.23z"
              />
              <path
                fill="#EA4335"
                d="M24 48c6.34 0 11.91-2.1 15.88-5.7l-7.3-5.68c-2.02 1.36-4.61 2.17-8.58 2.17-6.02 0-11.1-3.7-13.02-8.94l-8.03 6.23C6.87 42.52 14.82 48 24 48z"
              />
            </svg>

            <span className="text-gray-700 dark:text-gray-200 font-medium">
              Continue with Google
            </span>
          </button>

          <div className="text-center text-sm dark:text-gray-400">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary cursor-pointer">
              Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
