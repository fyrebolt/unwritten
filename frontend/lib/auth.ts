/**
 * Real auth client. Talks to the Hono backend at /v1/auth/* via the
 * /__unwritten_api proxy (see next.config.mjs). Stores the JWT and a public
 * profile snapshot in localStorage; both are wiped on signout.
 */

import { getApiBase } from "@/lib/api";

const TOKEN_KEY = "unwritten_token";
const USER_KEY = "unwritten_user";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  initials: string;
  medicalProfile?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

type ApiUser = {
  id: string;
  email: string;
  name: string;
  medicalProfile?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

type ApiAuthOk = { ok: true; token: string; user: ApiUser };
type ApiAuthErr = { ok: false; error: string };
type ApiMeOk = { ok: true; user: ApiUser };

function initialsFor(name: string, email: string): string {
  const trimmed = name.trim();
  if (trimmed) {
    return trimmed
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0] ?? "")
      .join("")
      .toUpperCase();
  }
  return (email[0] ?? "?").toUpperCase();
}

function toAuthUser(api: ApiUser): AuthUser {
  return {
    id: api.id,
    email: api.email,
    name: api.name || api.email,
    initials: initialsFor(api.name, api.email),
    medicalProfile: api.medicalProfile,
    createdAt: api.createdAt,
    updatedAt: api.updatedAt,
  };
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getToken() && getCurrentUser());
}

function persist(token: string, user: AuthUser) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function signOut(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

async function postAuth(
  path: "/v1/auth/signup" | "/v1/auth/login",
  body: Record<string, string>,
): Promise<AuthUser> {
  const res = await fetch(`${getApiBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: ApiAuthOk | ApiAuthErr;
  try {
    data = (await res.json()) as ApiAuthOk | ApiAuthErr;
  } catch {
    throw new Error(`Auth request failed (${res.status}). Is the API running?`);
  }
  if (!res.ok || !data.ok) {
    const code = (data as ApiAuthErr).error || `HTTP ${res.status}`;
    throw new Error(humanizeAuthError(code));
  }
  const user = toAuthUser(data.user);
  persist(data.token, user);
  return user;
}

export async function signUp(opts: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUser> {
  return postAuth("/v1/auth/signup", {
    email: opts.email,
    password: opts.password,
    ...(opts.name ? { name: opts.name } : {}),
  });
}

export async function signIn(opts: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  return postAuth("/v1/auth/login", {
    email: opts.email,
    password: opts.password,
  });
}

/** Refresh the cached user from /v1/me. Returns null if the token is gone or rejected. */
export async function refreshMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch(`${getApiBase()}/v1/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 404) {
    signOut();
    return null;
  }
  if (!res.ok) return getCurrentUser();
  const data = (await res.json()) as ApiMeOk | ApiAuthErr;
  if (!data.ok) return getCurrentUser();
  const user = toAuthUser(data.user);
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

/** Authenticated fetch helper: adds Bearer token, throws on 401, parses JSON. */
export async function authedFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(`${getApiBase()}${path}`, { ...init, headers });
  if (res.status === 401) {
    signOut();
    throw new Error("Session expired. Please sign in again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : null) ?? `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function humanizeAuthError(code: string): string {
  switch (code) {
    case "email-and-password-required":
      return "Please enter both email and password.";
    case "password-too-short":
      return "Password must be at least 8 characters.";
    case "email-already-used":
      return "An account with this email already exists.";
    case "invalid-credentials":
      return "Email or password is incorrect.";
    default:
      return code;
  }
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(" ")[0] || name;
  if (hour < 5) return `Still up, ${first}.`;
  if (hour < 12) return `Good morning, ${first}.`;
  if (hour < 18) return `Good afternoon, ${first}.`;
  return `Good evening, ${first}.`;
}
