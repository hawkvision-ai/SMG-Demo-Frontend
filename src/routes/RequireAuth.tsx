import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { JSX } from "react";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth(); // Make sure this exists in AuthContext

  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}
