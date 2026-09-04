import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  return (
    // 1. Fixed viewport height (h-screen) with overflow-hidden stops whole-page scrolling
    <div className="flex h-screen w-full bg-softBg font-sans text-textDark selection:bg-primary/20 overflow-hidden">
      
      {/* 2. Fixed left sidebar */}
      <aside className="w-64 h-full shrink-0 border-r border-slate-800 bg-darkBg z-20">
        <Sidebar />
      </aside>

      {/* 3. Independent scroll area for main content only */}
      <main className="flex-1 h-full overflow-y-auto p-8 custom-scrollbar">
        <Outlet />
      </main>

    </div>
  );
}