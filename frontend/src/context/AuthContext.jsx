import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios"; 

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    user: null,
    token: localStorage.getItem("token") || null,
  });

  // This useEffect sets the auth header for all REQUESTS
  useEffect(() => {
    if (auth.token) {
      localStorage.setItem("token", auth.token);
      api.defaults.headers.common["Authorization"] = `Bearer ${auth.token}`;
    } else {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [auth.token]);

  // --- NEW CODE: RESPONSE INTERCEPTOR ---
  // This useEffect will watch for all RESPONSES
  useEffect(() => {
    const responseInterceptor = api.interceptors.response.use(
      (response) => response, // If response is good (2xx), just return it
      (error) => {
        // If the response is an error
        if (error.response && error.response.status === 401) {
          // Token is bad (expired or invalid)
          console.log("AuthContext: Received 401. Logging out.");
          logout(); // Call the logout function to clear state
        }
        // Always return the error so the component can handle it
        return Promise.reject(error);
      }
    );

    // Cleanup function: remove the interceptor when the component unmounts
    return () => {
      api.interceptors.response.eject(responseInterceptor);
    };
  }, []); // Empty dependency array means this runs once on mount

  // Login
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setAuth({
      token: res.data.access_token,
      user: res.data.user,
    });
  };

  // Register
  const register = async (name, email, password, role) => {
    const res = await api.post("/auth/register", { name, email, password, role });
    return res.data;
  };

  // Logout
  const logout = () => {
    setAuth({
      token: null,
      user: null,
    });
  };

  return (
    <AuthContext.Provider value={{ auth, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}