import { createContext, useContext, useState, ReactNode } from "react";

type EnvType = "real" | "virtual";
interface EnvContextProps {
  env: EnvType;
  setEnv: (env: EnvType) => void;
  isSwitchEnabled: boolean;
  setSwitchEnabled: (enabled: boolean) => void;
}

const EnvContext = createContext<EnvContextProps | undefined>(undefined);

export const EnvProvider = ({ children }: { children: ReactNode }) => {
  // Initialize env from localStorage or default to "real"
  const [env, setEnvState] = useState<EnvType>(() => {
    const savedEnv = localStorage.getItem("hawkview-env");
    return (savedEnv === "real" || savedEnv === "virtual") ? savedEnv : "real";
  });
  
  // Initialize switch state from localStorage or default to false
  const [isSwitchEnabled, setSwitchEnabledState] = useState(() => {
    const savedSwitchState = localStorage.getItem("hawkview-env-switch-enabled");
    return savedSwitchState === "true";
  });

  // Wrapper function to save env to localStorage when changed
  const setEnv = (newEnv: EnvType) => {
    setEnvState(newEnv);
    localStorage.setItem("hawkview-env", newEnv);
  };

  // Wrapper function to save switch state to localStorage when changed
  const setSwitchEnabled = (enabled: boolean) => {
    setSwitchEnabledState(enabled);
    localStorage.setItem("hawkview-env-switch-enabled", enabled.toString());
  };

  return (
    <EnvContext.Provider value={{ env, setEnv, isSwitchEnabled, setSwitchEnabled }}>
      {children}
    </EnvContext.Provider>
  );
};

export const useEnv = () => {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error("useEnv must be used within EnvProvider");
  return ctx;
};
