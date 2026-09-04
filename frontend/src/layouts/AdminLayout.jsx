import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-softBg font-sans text-textDark selection:bg-primary/20">
      {/* Fixed Sticky Full Viewport Height Sidebar */}
      <aside className="sticky top-0 h-screen shrink-0 z-20">
        <Sidebar />
      </aside>

      {/* Main Content Area with Independent Scroll */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}