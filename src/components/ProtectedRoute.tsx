import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../hooks/authContext";
import { FullScreenLoader } from "./StateViews";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isRestoring } = useAuth();

  if (isRestoring) return <FullScreenLoader label="Restoring your session…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  return <>{children}</>;
}
