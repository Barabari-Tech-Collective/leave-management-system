import React, { useState } from "react";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import { X, UserPlus, Sparkles, Key, Mail, User, Briefcase, Layers, ShieldCheck } from "lucide-react";

const VERTICALS = ["Program", "Placement", "EdTech", "Operations", "None"];

export default function CreateUserModal({ isOpen, onClose, currentUser, onUserCreated }) {
  const isAdmin = currentUser?.role === "admin";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    vertical: isAdmin ? "Program" : currentUser?.vertical || "Operations",
    isVerticalLead: false,
    jobRole: "",
    role: "employee"
  });

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await API.post("/auth/create-user", form);
      toast.success("Team member onboarded successfully! 🚀");
      onUserCreated();
      onClose();
      setForm({
        name: "",
        email: "",
        password: "",
        vertical: isAdmin ? "Program" : currentUser?.vertical || "Operations",
        isVerticalLead: false,
        jobRole: "",
        role: "employee"
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-primary via-indigo-600 to-indigo-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
              <UserPlus size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Onboard New Member</h2>
              <p className="text-xs text-indigo-100 mt-0.5 font-medium">
                {isAdmin
                  ? "Provision credentials and assign roles across organization verticals."
                  : `Add new team member directly to ${currentUser?.vertical} vertical.`}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body - Smooth Scroll Container */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1 text-sm font-medium">
          
          {/* Full Name & Email in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white transition text-slate-800"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Password & Job Role in 2 columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                Temporary Password
              </label>
              <div className="relative">
                <Key size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary focus:bg-white transition text-slate-800"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
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
                  placeholder="e.g. Brands & Comms Lead"
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
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-primary" /> Privilege & Governance Settings
              </span>

              <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Vertical Lead Toggle Button */}
                <div
                  onClick={() => setForm({ ...form, isVerticalLead: !form.isVerticalLead })}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition select-none ${
                    form.isVerticalLead
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 shadow-sm"
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

                {/* System Role Selector */}
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
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? "Onboarding..." : "Confirm & Save Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}