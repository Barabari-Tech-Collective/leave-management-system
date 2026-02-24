import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChevronDown } from "lucide-react";
import Navbar from "../../components/Navbar";

export default function Signup() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: "employee",
  });

  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.email || !form.password || !form.confirmPassword) {
      return setError("All fields are required.");
    }

    if (form.password.length < 6) {
      return setError("Password must be at least 6 characters.");
    }

    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }

    setError("");

    // Save to localStorage (demo purpose)
    localStorage.setItem(
      "userCredentials",
      JSON.stringify({
        email: form.email,
        password: form.password,
        role: form.role,
      }),
    );

    login(form.email, form.role);

    navigate(form.role === "admin" ? "/admin" : "/employee");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary/20 via-white to-accent/20 dark:from-primary/10 dark:via-neutral-950 dark:to-accent/10 transition-colors">
      <Navbar />
      <div className="flex-1 px-4 py-8 flex items-center justify-center">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-neutral-900 p-6 md:p-10 rounded-2xl shadow-2xl w-full max-w-md space-y-6 border border-transparent dark:border-neutral-800 transition-colors animate-fadeIn"
        >
          <h2 className="text-2xl font-bold text-center text-textDark dark:text-white">Create Account</h2>

          <input
            type="email"
            placeholder="example@gmail.com"
            className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-neutral-800 dark:text-white transition-colors"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          {/* Password Field */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-neutral-800 dark:text-white transition-colors"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />

            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-3 cursor-pointer text-sm text-gray-500"
            >
              {showPassword ? "Hide" : "Show"}
            </span>
          </div>

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className="w-full p-3 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-neutral-800 dark:text-white transition-colors"
            value={form.confirmPassword}
            onChange={(e) =>
              setForm({ ...form, confirmPassword: e.target.value })
            }
          />

          <div className="relative">
            <select
              className="w-full appearance-none p-3 pr-10 border border-gray-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary outline-none bg-white dark:bg-neutral-800 dark:text-white cursor-pointer transition-colors"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              size={20}
            />
          </div>

          {error && <div className="text-red-500 text-sm">{error}</div>}

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary dark:focus:ring-offset-neutral-900"
          >
            Sign Up
          </button>

          <div className="text-center text-sm dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/" className="text-primary hover:underline">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
