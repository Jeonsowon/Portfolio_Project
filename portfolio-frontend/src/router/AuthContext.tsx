// src/router/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { setAuthToken } from "../lib/api";

type Ctx = { token: string | null; setToken: (t: string | null) => void; ready: boolean };
const AuthContext = createContext<Ctx>({ token: null, setToken: () => {}, ready: false });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token"));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthToken(token);
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
    setReady(true);
  }, [token]);

  const setToken = (t: string | null) => setTokenState(t);

  return (
    <AuthContext.Provider value={{ token, setToken, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);