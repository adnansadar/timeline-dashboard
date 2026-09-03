import { createContext, useContext } from "react";

import type { CurrentUser } from "../types/api";

export interface AuthContextValue {
  user: CurrentUser | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
