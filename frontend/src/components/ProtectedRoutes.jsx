// src/components/ProtectedRoute.jsx
import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const { auth } = useAuth();

  if (!auth.token) {
    // If there's no token, redirect to the login page
    return <Navigate to="/" replace />;
  }

  // If there is a token, show the child component (the Dashboard)
  return <Outlet />;
}