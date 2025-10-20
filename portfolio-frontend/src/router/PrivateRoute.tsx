// src/router/PrivateRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../router/AuthContext";
import type { ReactNode } from "react";

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { ready, token } = useAuth();
  const location = useLocation();

  if (!ready) {
    return <div className="p-8 text-center text-gray-500">초기화 중…</div>;
  }
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children
}