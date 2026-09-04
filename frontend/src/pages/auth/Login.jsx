import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/Loader";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";

export default function Login() {
  const { user, loading, checkAuth } = useAuth();
  const navigate = useNavigate();

  const [isResetMode, setIsResetMode] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    currentPassword: "",
    newPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // 1. Google OAuth Flow
  const handleGoogleLogin = () => {
    window.open(`${import.meta.env.VITE_API_URL}/auth/google`, "_self");
  };

  // 2. Manual Email + Password Login Flow
  const handleManualLogin = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await API.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      toast.success("Login Successful 🚀");
      
      // Refresh AuthContext session state
      if (checkAuth) await checkAuth();

      const loggedUser = res.data.user;
      if (loggedUser.role === "admin") navigate("/admin");
      else navigate("/employee");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid credentials");
      setSubmitting(false);
    }
  };

  // 3. Password Reset Flow
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await API.post("/auth/reset-password", {
        email: form.email,
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      toast.success("Password updated successfully! Please login with your new password.");
      setIsResetMode(false);
      setForm({ ...form, password: "", currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  // Already authenticated check
  if (user) {
    return (
      <Navigate to={user.role === "admin" ? "/admin" : "/employee"} />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-primary/20 via-white to-accent/20 p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md text-center space-y-6">
        
        <h2 className="text-2xl font-bold text-slate-800">
          {isResetMode ? "Reset Password" : "Login to Leave System"}
        </h2>

        {!isResetMode ? (
          <>
            {/* Manual Email & Password Form */}
            <form onSubmit={handleManualLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@barabaricollective.org"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign In with Password"}
              </button>
            </form>

            <div className="flex items-center my-4">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="px-3 text-xs font-bold text-slate-400 uppercase">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Google OAuth Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl hover:scale-[1.02] transition flex items-center justify-center gap-2"
            >
              <span>🚀</span> Continue with Google
            </button>

            <p
              onClick={() => setIsResetMode(true)}
              className="text-xs text-primary font-bold cursor-pointer hover:underline pt-2 inline-block"
            >
              First time login? Change temporary password
            </p>
          </>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handlePasswordReset} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@barabaricollective.org"
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Current / Temporary Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••"
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                New Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary outline-none text-sm"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>

            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full text-xs text-slate-500 font-bold hover:underline pt-2 text-center block"
            >
              ← Back to Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}