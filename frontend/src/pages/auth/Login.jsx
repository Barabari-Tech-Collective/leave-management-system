import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Loader from "../../components/Loader";
import API from "../../api/axiosConfig";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const { user, loading } = useAuth();

  const [isResetMode, setIsResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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

      const loggedUser = res.data.user;

      if (loggedUser.role === "admin") {
        window.location.href = "/admin";
      } else if (loggedUser.isVerticalLead) {
        window.location.href = "/vertical-lead";
      } else {
        window.location.href = "/employee";
      }
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
      setForm({ email: "", password: "", currentPassword: "", newPassword: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to reset password");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loader />;
  }

  // Already authenticated check
  if (user) {
    if (user.role === "admin") return <Navigate to="/admin" replace />;
    if (user.isVerticalLead) return <Navigate to="/vertical-lead" replace />;
    return <Navigate to="/employee" replace />;
  }

  return (
    // FIXED: Uses min-h-screen w-full instead of w-screen to stop unwanted scrollbars
    <div className="min-h-screen w-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-100 p-4">
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md text-center space-y-5 my-auto">
        
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {isResetMode ? "Reset Password" : "Login to Leave System"}
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            The Barabari Collective Portal
          </p>
        </div>

        {!isResetMode ? (
          <>
            {/* Manual Email & Password Form */}
            <form onSubmit={handleManualLogin} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 tracking-wider">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@barabaricollective.org"
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 focus:bg-white transition"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    className="w-full p-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50 focus:bg-white transition"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Signing in..." : "Sign In with Password"}
              </button>
            </form>

            <div className="flex items-center my-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">OR</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            {/* Google OAuth Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-red-500 text-white font-semibold py-3 rounded-xl hover:bg-red-600 transition flex items-center justify-center gap-2 text-sm shadow-md shadow-red-100 cursor-pointer"
            >
              <span>🚀</span> Continue with Google
            </button>

            <p
              onClick={() => setIsResetMode(true)}
              className="text-xs text-indigo-600 font-bold cursor-pointer hover:underline pt-1 inline-block"
            >
              First time login? Change temporary password
            </p>
          </>
        ) : (
          /* Password Reset Form */
          <form onSubmit={handlePasswordReset} className="space-y-4 text-left">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="name@barabaricollective.org"
                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 tracking-wider">
                Current / Temporary Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1 tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full p-3 pr-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-slate-50"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl hover:bg-emerald-700 transition shadow-md shadow-emerald-200 cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>

            <button
              type="button"
              onClick={() => setIsResetMode(false)}
              className="w-full text-xs text-slate-500 font-bold hover:underline pt-1 text-center block cursor-pointer"
            >
              ← Back to Login
            </button>
          </form>
        )}

      </div>
    </div>
  );
}