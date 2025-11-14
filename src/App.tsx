import { Routes, Route } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { RequireAuth } from "./routes/RequireAuth";
import NotFoundPage from "./pages/NotFoundPage";
import SSOCallback from "./components/auth/SSOCallbackHandler";
// import { RequireAuth } from "./routes/RequireAuth"; // Import RequireAuth

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/auth/ms" element={<SSOCallback />} />
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
