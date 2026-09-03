import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AUTH_ME_KEY,
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from "../api/auth";
import { getToken, setToken, setUnauthorizedHandler } from "../api/client";
import { AuthContext } from "./authContext";
import type { AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));

  const meQuery = useQuery({
    queryKey: AUTH_ME_KEY,
    queryFn: fetchCurrentUser,
    enabled: hasToken,
    retry: false,
    staleTime: Infinity,
  });

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setHasToken(false);
      queryClient.clear();
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate, queryClient]);

  const login = useCallback(
    async (username: string, password: string) => {
      const { access_token } = await loginRequest(username, password);
      setToken(access_token);
      try {
        await queryClient.fetchQuery({
          queryKey: AUTH_ME_KEY,
          queryFn: fetchCurrentUser,
        });
      } catch (error) {
        setToken(null);
        throw error;
      }
      setHasToken(true);
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // Deliberately ignored. The user's intent is unambiguous, so a failed
      // server call must not leave them logged in on this device.
    }
    setToken(null);
    setHasToken(false);
    queryClient.clear();
    navigate("/login", { replace: true });
  }, [navigate, queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isAuthenticated: Boolean(meQuery.data),
      isRestoring: hasToken && meQuery.isLoading,
      login,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, hasToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
