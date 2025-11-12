// src/components/Sidebar.jsx

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
} from "@heroicons/react/24/outline";

export default function Sidebar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  // Define menu items with icons
  const menuConfig = {
    user: [
      { label: "Dashboard", to: "/dashboard", icon: HomeIcon },
      { label: "Mood Tracking", to: "/mood", icon: ChartBarIcon },
      { label: "Alerts", to: "/alerts", icon: BellAlertIcon },
      {label: "Reports", to: "/reports", icon: ChartBarIcon },
    ],
    guardian: [
      { label: "Dashboard", to: "/guardian", icon: HomeIcon }, 
      { label: "Reports", to: "/reports", icon: ChartBarIcon }, 
      { label: "Alerts", to: "/alerts", icon: BellAlertIcon },
      {label: "Reports", to: "/reports", icon: ChartBarIcon },
    ],
    doctor: [
      { label: "Dashboard", to: "/doctor", icon: HomeIcon }, 
      { label: "Patients", to: "/patients", icon: UserCircleIcon }, 
      { label: "Reports", to: "/reports", icon: ChartBarIcon },
      {label: "Reports", to: "/reports", icon: ChartBarIcon }, 
    ],
  };

  // Get the appropriate menu based on the user's role
  const currentMenu = auth?.user?.role ? menuConfig[auth.user.role] : [];

  const handleLogout = () => {
    navigate("/"); 
    setTimeout(() => {
      logout(); 
    }, 0);
  };

  // Helper for role icon and color
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

  return (
    // Sidebar container: Slightly wider, light background, flex column layout
    <aside className="w-72 bg-gradient-to-b from-slate-50 to-slate-100 shadow-lg flex flex-col h-screen border-r border-slate-200">
      {/* 1. App Logo/Title */}
      <div className="px-6 py-5 border-b border-slate-200">
        <Link to="/" className="text-2xl font-bold text-sky-600">
          Nexis
        </Link>
      </div>

      {/* 2. Profile Section */}
      {auth && auth.user && (
        <div className="px-6 py-5 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-1">
            <RoleIcon className={`h-6 w-6 ${roleInfo.color}`} /> 
            <span className={`text-sm font-semibold uppercase tracking-wider ${roleInfo.color}`}>
              {auth.user.role}
            </span>
          </div>
          <p className="text-lg font-semibold text-slate-800 truncate" title={auth.user.name}>
             {auth.user.name}
          </p>
          {/* Optional: Add email or other info */}
          {/* <p className="text-xs text-slate-500 truncate">{auth.user.email}</p> */}
        </div>
      )}

      {/* 3. Navigation Section */}
      <nav className="flex-grow px-4 py-4 space-y-2 overflow-y-auto">
        {currentMenu.map((item) => {
          const ItemIcon = item.icon; 
          return (
            <NavLink 
              key={item.to}
              to={item.to}
              
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150 ease-in-out ${
                  isActive
                    ? "bg-sky-100 text-sky-700 font-semibold" 
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-800" 
                }`
              }
            >
              <ItemIcon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* 4. Settings & Logout Section */}
      <div className="px-4 py-4 border-t border-slate-200 space-y-2">
         <NavLink
            to="/settings" // Assuming a /settings route
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors duration-150 ease-in-out ${
                  isActive
                    ? "bg-sky-100 text-sky-700 font-semibold"
                    : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
                }`
              }
            >
              <Cog6ToothIcon className="h-5 w-5 flex-shrink-0" />
              <span>Settings</span>
          </NavLink>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full text-left px-4 py-2.5 rounded-lg text-slate-600 hover:bg-red-100 hover:text-red-700 transition-colors duration-150 ease-in-out"
        >
          <ArrowLeftOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}