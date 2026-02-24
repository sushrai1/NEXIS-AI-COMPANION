// src/components/Layout.jsx
// On mobile, adds top padding so content isn't hidden behind the hamburger button.
// The `key={pathname}` on <main> re-mounts it on every route change,
// which re-triggers the animate-page-enter CSS animation — giving smooth
// fade+slide transitions between Dashboard, Mood Tracking, Reports, etc.
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main
          key={pathname}
          className="flex-1 p-6 pt-16 md:pt-6 overflow-y-auto animate-page-enter"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
