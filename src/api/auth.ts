import { api } from "./client";
import type { CurrentUser, LoginResponse } from "../types/api";

export const AUTH_ME_KEY = ["auth", "me"] as const;

export function login(
  username: string,
  password: string,
): Promise<LoginResponse> {
  return api.post<LoginResponse>("/auth/login", { username, password });
}

export function fetchCurrentUser(): Promise<CurrentUser> {
  return api.get<CurrentUser>("/auth/me");
}

export function logout(): Promise<unknown> {
  return api.post<unknown>("/auth/logout");
}
