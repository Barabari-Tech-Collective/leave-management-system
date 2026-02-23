import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-white to-accent/20">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-10 rounded-2xl shadow-2xl w-full max-w-md space-y-6 animate-fadeIn"
      >
        <h2 className="text-2xl font-bold text-center">Create Account</h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />

        {/* Password Field */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
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
          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={form.confirmPassword}
          onChange={(e) =>
            setForm({ ...form, confirmPassword: e.target.value })
          }
        />

        <select
          className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <button
          type="submit"
          className="w-full bg-primary text-white py-3 rounded-xl hover:scale-[1.02] transition cursor-pointer"
        >
          Sign Up
        </button>

        <div className="text-center text-sm">
          Already have an account?{" "}
          <Link to="/" className="text-primary hover:underline">
            Login
          </Link>
        </div>
      </form>
    </div>
  );
}
