// src/components/Sidebar.jsx

import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import {
  HomeIcon,
  ChartBarIcon,
  BellAlertIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ShieldCheckIcon,
  BriefcaseIcon,
  Bars3Icon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const menuConfig = {
    user: [
      { label: "Dashboard", to: "/dashboard", icon: HomeIcon },
      { label: "Mood Tracking", to: "/mood", icon: ChartBarIcon },
      { label: "Alerts", to: "/alerts", icon: BellAlertIcon },
      { label: "Reports", to: "/reports", icon: ChartBarIcon },
    ],
    guardian: [
      { label: "Dashboard", to: "/guardian", icon: HomeIcon },
      { label: "Reports", to: "/reports", icon: ChartBarIcon },
      { label: "Alerts", to: "/alerts", icon: BellAlertIcon },
    ],
    doctor: [
      { label: "Dashboard", to: "/doctor", icon: HomeIcon },
      { label: "Patients", to: "/patients", icon: UserCircleIcon },
      { label: "Reports", to: "/reports", icon: ChartBarIcon },
    ],
  };

  const currentMenu = auth?.user?.role ? menuConfig[auth.user.role] ?? [] : [];

  const handleLogout = () => {
    navigate("/");
    setTimeout(() => {
      logout();
    }, 0);
  };

  const getRoleInfo = (role) => {
    switch (role) {
      case "guardian":
        return { icon: ShieldCheckIcon, color: "text-green-600" };
      case "doctor":
        return { icon: BriefcaseIcon, color: "text-purple-600" };
      case "user":
      default:
        return { icon: UserCircleIcon, color: "text-sky-600" };
    }
  };

  const roleInfo = getRoleInfo(auth?.user?.role);
  const RoleIcon = roleInfo.icon;

  // Shared nav link class builder
  const navClass = ({ isActive }) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150 ease-in-out ${isActive
      ? "bg-sky-100 text-sky-700 font-semibold"
      : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
    }`;

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-sky-600">
          Nexis
        </Link>
        {/* Mobile close button */}
        <button
          className="md:hidden text-slate-500 hover:text-slate-800"
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
      </div>

      {/* Profile */}
      {auth?.user && (
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            {/* Avatar circle with initials */}
            <div
              className={`
                flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center
                text-white font-bold text-lg shadow-inner select-none
                ${auth.user.role === "guardian"
                  ? "bg-gradient-to-br from-green-400 to-emerald-600"
                  : auth.user.role === "doctor"
                    ? "bg-gradient-to-br from-purple-400 to-indigo-600"
                    : "bg-gradient-to-br from-sky-400 to-blue-600"}
              `}
              aria-hidden="true"
            >
              {auth.user.name?.charAt(0).toUpperCase() ?? "?"}
            </div>

            {/* Name + role */}
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-semibold text-slate-800 truncate leading-tight"
                title={auth.user.name}
              >
                {auth.user.name}
              </p>
              {auth.user.email && (
                <p
                  className="text-xs text-slate-400 truncate leading-tight mt-0.5"
                  title={auth.user.email}
                >
                  {auth.user.email}
                </p>
              )}
              {/* Role badge */}
              <span
                className={`
                  inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider
                  ${auth.user.role === "guardian"
                    ? "bg-green-100 text-green-700"
                    : auth.user.role === "doctor"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-sky-100 text-sky-700"}
                `}
              >
                {auth.user.role}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-grow px-4 py-4 space-y-2 overflow-y-auto">
        {currentMenu.map((item) => {
          const ItemIcon = item.icon;
          return (
            <NavLink
              key={`${item.label}-${item.to}`}
              to={item.to}
              className={navClass}
              onClick={() => setIsOpen(false)}
            >
              <ItemIcon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Settings & Logout */}
      <div className="px-4 py-4 border-t border-slate-200 space-y-2">
        <NavLink to="/settings" className={navClass} onClick={() => setIsOpen(false)}>
          <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
          <span>Settings</span>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-lg text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-150 ease-in-out"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 bg-white border border-slate-200 rounded-lg p-2 shadow-md text-slate-600 hover:text-sky-600"
        onClick={() => setIsOpen(true)}
        aria-label="Open menu"
      >
        <Bars3Icon className="h-6 w-6" />
      </button>

      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless open, always visible on md+ */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-72 bg-gradient-to-b from-slate-50 to-slate-100
          shadow-lg flex flex-col h-screen border-r border-slate-200
          transition-transform duration-200 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}