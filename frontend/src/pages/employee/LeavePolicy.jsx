import React from "react";

export default function LeavePolicy() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 font-sans text-slate-800 space-y-8">
      {/* Header */}
      <div className="bg-linear-to-r from-primary via-indigo-600 to-indigo-800 text-white p-8 rounded-3xl shadow-lg">
        <span className="bg-white/20 text-xs uppercase tracking-widest px-3 py-1 rounded-full font-semibold">
          Barabari Collective
        </span>
        <h1 className="text-3xl font-extrabold mt-3">Company Leave Policy</h1>
        <div className="flex flex-wrap gap-4 text-xs font-medium text-indigo-100 mt-2">
          <span>📅 Effective Date: Jan 1, 2026 - Jan 1, 2027</span>
          <span>👥 Applicability: All Full-Time Employees</span>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Entitlement Summary Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">Sick Leave</p>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">10 Days</h3>
          <p className="text-xs text-slate-500 mt-2">For sudden or planned medical reasons.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">Casual Leave</p>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">11 Days</h3>
          <p className="text-xs text-slate-500 mt-2">For personal commitments and rest.</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-bold text-slate-400 uppercase">Floating Cultural</p>
          <h3 className="text-2xl font-black text-indigo-600 mt-1">5 Days</h3>
          <p className="text-xs text-slate-500 mt-2">Choose based on personal culture/festivals.</p>
        </div>
      </div>

      {/* Main Document Sections */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xs space-y-8 text-sm">
        
        {/* 1. Objective */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">1. Objective & Scope</h2>
          <p className="text-slate-600 leading-relaxed">
            The objective of this policy is to provide guidelines for leave entitlement and management, ensuring a healthy work-life balance for all employees while maintaining business continuity. This policy applies to all regular, full-time employees of Barabari Collective.
          </p>
        </section>

        {/* 2. Work Week */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">2. Work Week & Operating Hours</h2>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li><strong>Standard Work Week:</strong> 6 days (Monday to Saturday), 8 hours per day.</li>
            <li><strong>Sundays:</strong> Weekly off. Employees must be available only for highly urgent product releases or critical tasks.</li>
          </ul>
        </section>

        {/* 3. Fixed National Holidays */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">3. Fixed National Holidays (4 Days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="font-bold text-slate-800">Republic Day</p>
              <p className="text-xs text-indigo-600 font-semibold">Jan 26</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="font-bold text-slate-800">Labour Day</p>
              <p className="text-xs text-indigo-600 font-semibold">May 01</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="font-bold text-slate-800">Independence Day</p>
              <p className="text-xs text-indigo-600 font-semibold">Aug 15</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl text-center">
              <p className="font-bold text-slate-800">Gandhi Jayanti</p>
              <p className="text-xs text-indigo-600 font-semibold">Oct 02</p>
            </div>
          </div>
        </section>

        {/* 4. Notice Periods */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">4. Mandatory Notice Periods</h2>
          <div className="space-y-2 text-slate-600">
            <p><strong>Short-Term (1-2 Days):</strong> Inform manager 24 hours in advance (For sudden illness, inform by 10:00 AM).</p>
            <p><strong>Medium-Term (3-4 Days):</strong> Inform Department Head & Manager 7 days in advance.</p>
            <p><strong>Long-Term (4+ Days):</strong> Discussion required 14 days in advance.</p>
          </div>
        </section>

        {/* 5. Rules */}
        <section className="space-y-2">
          <h2 className="text-lg font-bold text-slate-900 border-b pb-2">5. Key Terms & Conditions</h2>
          <ul className="list-disc pl-5 text-slate-600 space-y-1">
            <li><strong>Sandwich Rule:</strong> Intervening Sundays/Public Holidays will NOT be counted as leave.</li>
            <li><strong>Absconding:</strong> Absence for 3 consecutive days without notice will trigger disciplinary action.</li>
            <li><strong>Uncovered Cases:</strong> Subject to direct personalized discussion with Founders/Department Heads.</li>
          </ul>
        </section>

      </div>
    </div>
  );
}