import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    user: null,
    token: localStorage.getItem("token") || null,
  });

  // Track whether we've finished the initial rehydration check.
  // While this is true we don't render children, so ProtectedRoute never
  // tries to evaluate stale state.
  const [isRehydrating, setIsRehydrating] = useState(!!localStorage.getItem("token"));

  // --- Sync token to localStorage and axios default header ---
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem("token", auth.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${auth.token}`;
    } else {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [auth.token]);

  // --- On mount: if a token already exists, restore the user object ---
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (!storedToken) return; // no token → nothing to do

    // Set the header before the request so /auth/me is authenticated
    api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;

    api
      .get("/auth/me")
      .then((res) => {
        setAuth({ token: storedToken, user: res.data });
      })
      .catch(() => {
        // Token is expired / invalid — clear everything
        localStorage.removeItem("token");
        setAuth({ token: null, user: null });
      })
      .finally(() => {
        setIsRehydrating(false);
      });
  }, []); // run exactly once on mount

  // --- Global 401 interceptor ---
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (error) => {
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, []);

  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAuth({
      token: res.data.access_token,
      user: res.data.user,
    });
  };

  const register = async (name, email, password, role) => {
    const res = await api.post("/auth/register", { name, email, password, role });
    return res.data;
  };

  const logout = () => {
    setAuth({ token: null, user: null });
  };

  // Partial-update the user object in state (e.g. after a name change)
  const updateUser = (patch) => {
    setAuth((prev) => ({ ...prev, user: { ...prev.user, ...patch } }));
  };

  // Don't render anything until we know whether the stored token is valid.
  // This prevents a flash where ProtectedRoute redirects to "/" on reload.
  if (isRehydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm animate-pulse">Loading…</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ auth, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}