import axios from "axios";
import type {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

import type { MesEnvelope } from "../types/api";

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;
const TOKEN_KEY = "timeline-dashboard.access_token";
const LOGIN_PATH = "/auth/login";

if (!BASE_URL) {
  console.error(
    "VITE_API_BASE_URL is not set. Copy .env.example to .env and restart the dev server.",
  );
}

function readStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null; // Safari private mode and similar.
  }
}

let token: string | null = readStoredToken();

export function getToken(): string | null {
  return token;
}

export function setToken(next: string | null): void {
  token = next;
  try {
    if (next) localStorage.setItem(TOKEN_KEY, next);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* empty */
  }
}

export interface FieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly traceId: string | null;
  readonly fieldErrors: FieldError[];

  constructor(
    status: number,
    message: string,
    traceId: string | null = null,
    fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.traceId = traceId;
    this.fieldErrors = fieldErrors;
  }

  get isRetryable(): boolean {
    return this.status === 0 || this.status >= 500;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: "Could not reach the server. Check your connection and try again.",
  401: "Your session has expired. Please sign in again.",
  403: "Access denied — your account cannot view this data.",
  422: "The request was rejected as invalid.",
  500: "The server ran into a problem. Please retry.",
};

function messageFor(status: number, fromServer?: string | null): string {
  const trimmed = fromServer?.trim();
  if (trimmed) return trimmed;
  return DEFAULT_MESSAGES[status] ?? `Request failed (HTTP ${status}).`;
}

/** Pulls FastAPI-style `detail: [{ loc, msg }]` out of a 422 body. */
function extractFieldErrors(body: unknown): FieldError[] {
  const detail = (body as { detail?: unknown } | null | undefined)?.detail;
  if (!Array.isArray(detail)) return [];

  return detail.flatMap((entry): FieldError[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const { loc, msg } = entry as { loc?: unknown; msg?: unknown };
    if (typeof msg !== "string") return [];
    const field = Array.isArray(loc)
      ? loc
          .filter((part) => typeof part === "string" && part !== "body")
          .join(".")
      : "";
    return [{ field: field || "request", message: msg }];
  });
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null,
): void {
  onUnauthorized = handler;
}

function handleAuthFailure(error: ApiError, url: string | undefined): ApiError {
  if (error.status === 401 && !(url ?? "").includes(LOGIN_PATH)) {
    setToken(null);
    onUnauthorized?.();
  }
  return error;
}

const http = axios.create({
  baseURL: BASE_URL,
  timeout: 60_000,
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const current = getToken();
  if (current) config.headers.set("Authorization", `Bearer ${current}`);
  return config;
});

http.interceptors.response.use(
  (response) => {
    const envelope = response.data as MesEnvelope<unknown> | null;

    // The backend can report a failure inside a 200 response, so trust
    // `status_code` from the envelope over the HTTP status.
    if (envelope && typeof envelope === "object" && "status_code" in envelope) {
      if (envelope.status_code >= 400) {
        throw handleAuthFailure(
          new ApiError(
            envelope.status_code,
            messageFor(envelope.status_code, envelope.message),
            envelope.trace_id ?? null,
            extractFieldErrors(envelope.data),
          ),
          response.config.url,
        );
      }
      response.data = envelope.data;
    }

    return response;
  },
  (error: AxiosError) => {
    throw handleAuthFailure(fromAxiosError(error), error.config?.url);
  },
);

function fromAxiosError(error: AxiosError): ApiError {
  if (!error.response) {
    return new ApiError(0, messageFor(0));
  }

  const { status, data } = error.response;
  const envelope = data as MesEnvelope<unknown> | null;

  return new ApiError(
    status,
    messageFor(status, envelope?.message),
    envelope?.trace_id ?? null,
    extractFieldErrors(envelope?.data ?? data),
  );
}

export const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
    (await http.get<T>(url, config)).data,

  post: async <T>(
    url: string,
    body?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> => (await http.post<T>(url, body, config)).data,
};
