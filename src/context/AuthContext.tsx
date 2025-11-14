import { apiClient } from "@/api/api-client";
import { LoginResponse } from "@/api/types";
import { clearAllUserData } from "@/utils/browserStorage";
import { createContext, ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: LoginResponse | null;
  isAuthenticated: () => boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  resetAuth: () => void;
  error: string | null;
  isLoading: boolean;
  setUser: (user: LoginResponse | null) => void;
  getUserTimezoneOrUTC: () => string;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ---------------------------
// Constants
// ---------------------------
const TOKEN_REFRESH_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const TOKEN_TIMESTAMP_KEY = "tokenTimestamp";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [user, setUser] = useState<LoginResponse | null>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAuthenticated = () => !!user;
  const getUserTimezoneOrUTC = () => user?.timezone || "UTC";

  const clearRefreshInterval = () => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current);
      refreshIntervalRef.current = null;
    }
  };

  // ---------------------------
  // Refresh access token
  // ---------------------------
  const refreshUserToken = async () => {
    try {
      const response = await apiClient.refreshToken();

      // Update access token in localStorage
      localStorage.setItem("authToken", response.access_token);

      // Update user state with new access token
      const existingUser = localStorage.getItem("user");
      if (existingUser) {
        const parsedUser = JSON.parse(existingUser);
        const updatedUser = { ...parsedUser, access_token: response.access_token };
        setUser(updatedUser);
        localStorage.setItem("user", JSON.stringify(updatedUser));
      }

      // Update timestamp
      localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());

      console.log("Token refreshed successfully");
    } catch (error: any) {
      console.error("Token refresh failed:", error);

      // ✅ Logout on ANY refresh token failure (401, missing token, etc.)
      // Check multiple possible error structures
      const isUnauthorized =
        error?.response?.status === 401 ||
        error?.message === "Invalid or expired refresh token" ||
        error?.status === 401;

      if (isUnauthorized) {
        console.log("Refresh token invalid/expired → Logging out user...");
        logout();
      }
    }
  };

  const setupTokenRefresh = () => {
    clearRefreshInterval();

    const lastTokenTime = localStorage.getItem(TOKEN_TIMESTAMP_KEY);
    const now = Date.now();
    if (lastTokenTime && now - parseInt(lastTokenTime) >= TOKEN_REFRESH_INTERVAL) {
      refreshUserToken();
    } else if (!lastTokenTime) {
      localStorage.setItem(TOKEN_TIMESTAMP_KEY, now.toString());
    }

    refreshIntervalRef.current = setInterval(refreshUserToken, TOKEN_REFRESH_INTERVAL);
  };

  // ---------------------------
  // Login
  // ---------------------------
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.login(username, password);

      localStorage.setItem("authToken", response.access_token);
      localStorage.setItem("refreshToken", response.refresh_token);
      localStorage.setItem("user", JSON.stringify(response));
      localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());

      setUser(response);
      setupTokenRefresh();

      navigate("/dashboard");
      return true;
    } catch (err: any) {
      setError(err?.message || "Login failed");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------
  // Logout
  // ---------------------------
  const logout = () => {
    clearRefreshInterval();
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
    clearAllUserData();
    setUser(null);
    navigate("/login");
  };

  const resetAuth = () => {
    clearRefreshInterval();
    setUser(null);
    setError(null);
    setIsLoading(false);
  };

  // ---------------------------
  // Initialize on mount
  // ---------------------------
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");
    if (!token || !storedUser) return;

    setUser(JSON.parse(storedUser));
    setupTokenRefresh();

    const handleAuthReset = () => {
      resetAuth();
      navigate("/login");
    };

    window.addEventListener("auth-reset", handleAuthReset);

    return () => {
      clearRefreshInterval();
      window.removeEventListener("auth-reset", handleAuthReset);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        resetAuth,
        error,
        isLoading,
        setUser,
        getUserTimezoneOrUTC,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
