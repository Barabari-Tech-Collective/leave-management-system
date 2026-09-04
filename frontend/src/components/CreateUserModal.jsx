import React, { useState } from "react";
import API from "../api/axiosConfig";
import toast from "react-hot-toast";
import { X, UserPlus } from "lucide-react";

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
      toast.success("User created successfully! 🚀");
      onUserCreated();
      onClose();
      // Reset form
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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center z-50 p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <UserPlus size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Create New Member</h2>
            <p className="text-xs text-slate-500">
              {isAdmin
                ? "Add any employee or lead across verticals."
                : `Add a team member to ${currentUser?.vertical} vertical.`}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-medium">
          <div>
            <label className="block mb-1 text-slate-700">Full Name</label>
            <input
              type="text"
              required
              placeholder="Jane Doe"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block mb-1 text-slate-700">Email Address</label>
            <input
              type="email"
              required
              placeholder="jane@barabaricollective.org"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block mb-1 text-slate-700">Initial Temporary Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {/* Vertical Dropdown */}
          <div>
            <label className="block mb-1 text-slate-700">Vertical</label>
            <select
              disabled={!isAdmin}
              className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 disabled:opacity-75 outline-none"
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

          {/* Admin Exclusive Toggles */}
          {isAdmin && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Is Vertical Lead?</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-primary rounded cursor-pointer"
                  checked={form.isVerticalLead}
                  onChange={(e) => setForm({ ...form, isVerticalLead: e.target.checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-700 font-medium">Role</span>
                <select
                  className="p-2 border border-slate-200 rounded-lg text-xs font-semibold bg-white outline-none"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block mb-1 text-slate-700">Job Role</label>
                <input
                  type="text"
                  placeholder="Enter job role"
                  className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary"
                  value={form.jobRole}
                  onChange={(e) => setForm({ ...form, jobRole: e.target.value })}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl font-bold hover:opacity-95 transition disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}