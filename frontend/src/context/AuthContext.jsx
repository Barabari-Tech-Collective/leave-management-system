import { createContext, useContext, useState, useEffect } from "react";
import API from "../api/axiosConfig";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const res = await API.get("/auth/me");
      if (res.data && res.data._id) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    // Immediately clear local user state so components (like Login) never see a stale user during transition
    setUser(null);
    try {
      await API.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      navigate("/", { replace: true });
    }
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
