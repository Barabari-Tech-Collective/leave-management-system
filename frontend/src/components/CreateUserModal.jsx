import React, { useState } from "react";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import { 
  X, UserPlus, Key, Mail, User, Briefcase, 
  Layers, ShieldCheck, Eye, EyeOff, AlertCircle 
} from "lucide-react";
import { VERTICALS } from "../constants/leaveConstants";

export default function CreateUserModal({ isOpen, onClose, currentUser, onUserCreated = () => {} }) {
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "founder";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    vertical: isAdmin ? "Program" : currentUser?.vertical || "Operations",
    isVerticalLead: false,
    jobRole: "",
    role: "employee"
  });

  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Real-time Email Validation
  const validateEmail = (email) => {
  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail) {
    setEmailError("Email address field cannot be empty.");
    return false;
  }

  // 1. Check basic email syntax
 const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address (e.g. name@gmail.com)");
      return false;
    }

    setEmailError("");
    return true;
  };
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setForm({ ...form, email: value });
    if (value.trim()) {
      validateEmail(value);
    } else {
      setEmailError("");
    }
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  // User-friendly Toast Feedback
  if (!form.email.trim()) {
    toast.error("Please enter the new member's email address.");
    return;
  }

  if (!validateEmail(form.email)) {
      toast.error("Please enter a valid email address before submitting.");
      return;
    }

  try {
    setLoading(true);
    const res = await API.post("/auth/create-user", {
      ...form,
      email: form.email.trim().toLowerCase()
    });

    // Check if Email Delivery was Successful or Bounced/Failed
    if (res.data.emailSent) {
      toast.success("Member onboarded & Welcome Email delivered successfully! 🚀");
    } else {
      toast("Member account created, but Welcome Email could not be delivered. Please check if the email address exists.", {
        icon: "⚠️",
        duration: 6000
      });
    }

    if (typeof onUserCreated === "function") {
      onUserCreated();
    }
    onClose();
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to create user");
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-2 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[92vh]">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 p-4 sm:p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 sm:top-5 right-4 sm:right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="p-2.5 sm:p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner shrink-0">
              <UserPlus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight">Onboard New Member</h2>
              <p className="text-xs text-indigo-100 mt-0.5 font-medium">
                {isAdmin
                  ? "Provision credentials and assign roles across organization verticals."
                  : `Add new team member directly to ${currentUser?.vertical} vertical.`}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1 text-sm font-medium">
          
          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white transition text-slate-800"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="jane@barabaricollective.org"
                  className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:bg-white transition text-slate-800 ${
                    emailError
                      ? "border-rose-400 focus:ring-rose-500 bg-rose-50/30"
                      : "border-slate-200 focus:ring-primary"
                  }`}
                  value={form.email}
                  onChange={handleEmailChange}
                />
              </div>
              {emailError && (
                <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> {emailError}
                </p>
              )}
            </div>
          </div>

          {/* Password with Eye Toggle & Job Title */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                Temporary Password
              </label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white transition text-slate-800"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                Job Designation / Title
              </label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. Program Manager"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white transition text-slate-800"
                  value={form.jobRole}
                  onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Vertical Selection */}
          <div>
            <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
              Assigned Vertical
            </label>
            <div className="relative">
              <Layers size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
              <select
                disabled={!isAdmin}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary font-semibold text-indigo-600 disabled:opacity-75 disabled:bg-slate-100 cursor-pointer appearance-none"
                value={form.vertical}
                onChange={(e) => setForm({ ...form, vertical: e.target.value })}
              >
                {VERTICALS.map((v) => (
                  <option key={v} value={v}>
                    {v} Vertical
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Admin Exclusive Permissions Box */}
          {isAdmin && (
            <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> Privilege & Governance Settings
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1">
                <div
                  onClick={() => setForm({ ...form, isVerticalLead: !form.isVerticalLead })}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                    form.isVerticalLead
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-xs"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="text-xs font-bold">Vertical Lead Status</span>
                  <span
                    className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-black ${
                      form.isVerticalLead
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-300"
                    }`}
                  >
                    {form.isVerticalLead ? "✓" : ""}
                  </span>
                </div>

                <div>
                  <select
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="employee">System Role: Employee</option>
                    <option value="admin">System Role: Admin</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Modal Actions Footer */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer text-xs sm:text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || Boolean(emailError)}
              className="w-full sm:flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition cursor-pointer disabled:opacity-50 text-xs sm:text-sm"
            >
              {loading ? "Onboarding..." : "Confirm & Save Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}