/**
 * lib/auth.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralised auth helpers for ChooseTounsi frontend.
 * Works with Laravel Sanctum token-based auth (no CSRF, Bearer token only).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'seller' | 'client' | 'admin';
  is_approved: boolean;
  is_active: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface AuthError {
  message: string;
  status: number;
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const TOKEN_KEY = 'ct_auth_token';
const USER_KEY  = 'ct_auth_user';

// ─── Axios instance ───────────────────────────────────────────────────────────

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  timeout: 15_000,
});

// Attach token to every request automatically
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export { api };

// ─── Token helpers ────────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

export function getUserRole(): AuthUser['role'] | null {
  return getUser()?.role ?? null;
}

function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Set a lightweight cookie so Next.js middleware can check auth server-side.
  // We never store the actual Bearer token in a cookie — only a presence flag.
  document.cookie = 'ct_token_exists=1; path=/; max-age=86400; SameSite=Lax';
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Remove the presence cookie so middleware redirects correctly after logout
  document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
}


/**
 * clearLocalSession()
 * Clears localStorage + cookie with ZERO network calls.
 * Use on the login page — avoids the POST /api/auth/logout network call
 * which hangs or times out when there is no valid token.
 */
export function clearLocalSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ct_auth_token');
  localStorage.removeItem('ct_auth_user');
  document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
}
// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Calls POST /api/auth/login.
 * Saves token + user to localStorage on success.
 * Returns the redirect path based on role.
 * Throws AuthError on failure.
 */
export async function login(credentials: LoginCredentials): Promise<{
  user: AuthUser;
  redirectTo: string;
}> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);

    saveSession(data.token, data.user);

    // Role-based redirect — no admin here (admin is independent)
    const redirectTo = data.user.role === 'seller' ? '/seller' : '/';

    return { user: data.user, redirectTo };
  } catch (err: any) {
    const status  = err?.response?.status ?? 500;
    const message =
      err?.response?.data?.message ??
      'Unable to connect. Please check your connection.';

    throw { message, status } as AuthError;
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

/**
 * Calls POST /api/auth/logout (invalidates token server-side),
 * then clears localStorage regardless of response.
 */
export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } catch {
    // Fail silently — always clear session locally
  } finally {
    clearSession();
  }
}

// ─── Refresh user from API ────────────────────────────────────────────────────

/**
 * Re-fetches the current user from GET /api/auth/user.
 * Useful to check if a stored token is still valid.
 * Returns null if token is invalid/expired.
 */
export async function refreshUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<{ user: AuthUser }>('/auth/user');
    const user = data.user;
    const token = getToken();
    if (token) saveSession(token, user);
    return user;
  } catch {
    clearSession();
    return null;
  }
}