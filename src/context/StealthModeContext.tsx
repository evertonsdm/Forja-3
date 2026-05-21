import React, { createContext, useContext, useState } from "react";

interface StealthModeContextProps {
  isStealthMode: boolean;
  setIsStealthMode: (val: boolean) => void;
}

const StealthModeContext = createContext<StealthModeContextProps | undefined>(undefined);

export const StealthModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isStealthMode, setIsStealthModeState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ruleforge_is_stealth");
      return saved === "true";
    } catch {
      return false;
    }
  });

  const setIsStealthMode = (val: boolean) => {
    setIsStealthModeState(val);
    try {
      localStorage.setItem("ruleforge_is_stealth", val ? "true" : "false");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <StealthModeContext.Provider value={{ isStealthMode, setIsStealthMode }}>
      {children}
    </StealthModeContext.Provider>
  );
};

export const useStealthMode = () => {
  const context = useContext(StealthModeContext);
  if (context === undefined) {
    throw new Error("useStealthMode must be used within a StealthModeProvider");
  }
  return context;
};
