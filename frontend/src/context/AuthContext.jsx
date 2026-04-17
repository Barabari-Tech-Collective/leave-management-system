import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axiosConfig";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await API.get("/auth/me");
      console.log("User from API:", res.data);
       if (res.data && res.data._id) {
      setUser(res.data);
    } else {
      setTimeout(fetchUser, 500); // 🔥 retry once
    }
      setUser(res.data);
    } catch (error) {
      console.log("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    await API.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}