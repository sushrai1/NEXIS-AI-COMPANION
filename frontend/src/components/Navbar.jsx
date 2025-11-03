import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";

export default function Navbar() {
  // 1. Get the 'auth' object instead of 'user'
  const { auth, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/");
    setTimeout(() => {
      logout();
    }, 0);
  };

  return (
    <header className="flex justify-between items-center px-6 py-3 bg-white shadow">
      <h1 className="text-xl font-bold text-blue-600">Nexis</h1>
      <div className="flex items-center gap-4">
        {/* 2. Check for auth.user and use auth.user.name */}
        {auth && auth.user && <span className="text-gray-700">Hi, {auth.user.name}</span>}

        {/* 3. Check for auth.user to decide which links to show */}
        {auth.user ? (
          <button onClick={handleLogout} className="bg-red-500 text-white px-3 py-1 rounded">
            Logout
          </button>
        ) : (
          <>
            <Link to="/login" className="text-blue-600">Login</Link>
            <Link to="/register" className="text-blue-600">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}