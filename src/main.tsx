import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { EnvProvider } from "./context/EnvContext.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <EnvProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 5000,
            }}
          />
          <App />
        </EnvProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
