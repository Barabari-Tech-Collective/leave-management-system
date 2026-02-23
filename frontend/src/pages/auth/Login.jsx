import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/20 via-white to-accent/20">
      <form
        onSubmit={handleLogin}
        className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md space-y-6"
      >
        <h2 className="text-2xl font-bold text-center">
          Login
        </h2>

        <input
          type="email"
          placeholder="Email"
          required
          className="w-full p-2 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="w-full pe-5 p-3 border rounded-xl focus:ring-2 focus:ring-primary outline-none"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="employee">Employee</option>
          <option value="admin">Admin</option>
        </select>

        <button
          className="w-full bg-primary text-white py-3 rounded-xl hover:scale-[1.02] transition cursor-pointer"
        >
          Login
        </button>

        <div className="text-center text-sm">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary cursor-pointer">
            Sign Up
          </Link>
        </div>
      </form>
    </div>
  );
}