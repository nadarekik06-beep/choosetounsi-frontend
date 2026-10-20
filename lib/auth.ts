import axios from 'axios';
import { currentLocale, fallbackError } from '@/lib/i18n/clientLocale';
import { mergeGuestHistory } from '@/lib/tracking';
import { API_BASE } from '@/lib/constants'
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'seller' | 'client' | 'admin';
  is_approved: boolean;
  is_active: boolean;
  avatar: string | null;
  active_plan: 'free' | 'red' | 'black';
  onboarding_completed: boolean;
  /** Shoppers only: name, phone and a delivery address are set. Absent on old sessions. */
  profile_completed?: boolean;
  /** Last "Skip for now" on /complete-profile (ISO), null if never. */
  profile_prompt_skipped_at?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role?: 'client' | 'seller';
  /** Marketing e-mails are opt-in (unchecked by default). */
  marketing_opt_in?: boolean;
}

export interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

// Returned by register() — user must verify email before getting a token
export interface VerificationRequiredResponse {
  needs_verification: true;
  email: string;
  message: string;
}

export interface AuthError {
  message: string;
  status: number;
  needs_verification?: boolean;
  needs_resend?: boolean;
  email?: string;
}

const TOKEN_KEY = 'ct_auth_token';
const USER_KEY  = 'ct_auth_user';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (typeof window !== 'undefined') config.headers['Accept-Language'] = currentLocale();
  return config;
});

export { api };

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch { return null; }
}

export function isAuthenticated(): boolean {
  return !!getToken() && !!getUser();
}

export function getUserRole(): AuthUser['role'] | null {
  return getUser()?.role ?? null;
}

export function isSeller(): boolean {
  return getUser()?.role === 'seller';
}

export function isClient(): boolean {
  return getUser()?.role === 'client';
}

export function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = 'ct_token_exists=1; path=/; max-age=86400; SameSite=Lax';
  // Carry what they browsed as a guest into their personalized homepage.
  mergeGuestHistory(token);
  notifyAuthChange();
}

/** Refresh the cached user (same token) without the login side effects. */
export function updateSessionUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

/** Fired on login / logout so session-bound state (cart, favorites) reloads without a page refresh. */
export const AUTH_CHANGE_EVENT = 'ct-auth-change';

function notifyAuthChange(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
  notifyAuthChange();
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ct_auth_token');
  localStorage.removeItem('ct_auth_user');
  document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
  notifyAuthChange();
}

/**
 * Determine the post-login redirect path based on user role and state.
 * Used by both login() and verifyEmail() to keep redirect logic consistent.
 */
export function resolveRedirectPath(user: AuthUser, after = '/'): string {
  if (shouldPromptProfile(user)) return `/complete-profile?redirect=${encodeURIComponent(after)}`;
  if (user.role === 'client' && !user.onboarding_completed) {
    return after === '/' ? '/onboarding' : `/onboarding?redirect=${encodeURIComponent(after)}`;
  }
  if (user.role === 'seller') return after.startsWith('/seller') ? after : '/seller';
  if (user.role === 'admin')  return '/admin';
  return after;
}

/** A post-login destination from the URL: same-site paths only, never another origin. */
export function safeAfterLogin(raw: string | null | undefined): string | null {
  return raw && raw.startsWith('/') && !raw.startsWith('//') && !raw.startsWith('/auth') ? raw : null;
}

export async function login(credentials: LoginCredentials): Promise<{ user: AuthUser; redirectTo: string }> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    saveSession(data.token, data.user);
    return { user: data.user, redirectTo: resolveRedirectPath(data.user) };
  } catch (err: any) {
    throw {
      message:            err?.response?.data?.message ?? fallbackError('network'),
      status:             err?.response?.status ?? 500,
      needs_verification: err?.response?.data?.needs_verification ?? false,
      email:              err?.response?.data?.email ?? null,
    } as AuthError;
  }
}

/**
 * Register a new user.
 * Returns needs_verification + email — does NOT save a session.
 * The session is saved only after verifyEmail() succeeds.
 */
export async function register(credentials: RegisterCredentials): Promise<VerificationRequiredResponse> {
  clearLocalSession();
  try {
    const { data } = await api.post<VerificationRequiredResponse>('/auth/register', credentials);
    return data;
  } catch (err: any) {
    const validationErrors = err?.response?.data?.errors;
    const firstError = validationErrors
      ? Object.values(validationErrors as Record<string, string[]>)[0]?.[0]
      : null;
    throw {
      message: firstError ?? err?.response?.data?.message ?? fallbackError('network'),
      status:  err?.response?.status ?? 500,
    } as AuthError;
  }
}

/**
 * Verify the 6-digit code sent to the user's email.
 * On success: saves session and returns the resolved redirect path.
 */
export async function verifyEmail(
  email: string,
  code: string,
): Promise<{ user: AuthUser; redirectTo: string }> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/verify-email', { email, code });
    saveSession(data.token, data.user);
    return { user: data.user, redirectTo: resolveRedirectPath(data.user) };
  } catch (err: any) {
    throw {
      message:      err?.response?.data?.message ?? fallbackError('network'),
      status:       err?.response?.status ?? 500,
      needs_resend: err?.response?.data?.needs_resend ?? false,
    } as AuthError;
  }
}

/**
 * Request a new verification code for the given email.
 * Throws AuthError if the server returns an error (e.g. rate limited).
 */
export async function resendVerification(email: string): Promise<void> {
  try {
    await api.post('/auth/resend-verification', { email });
  } catch (err: any) {
    throw {
      message: err?.response?.data?.message ?? fallbackError('network'),
      status:  err?.response?.status ?? 500,
    } as AuthError;
  }
}

export async function logout(): Promise<void> {
  try { await api.post('/auth/logout'); } catch {}
  finally { clearSession(); }
}

export async function refreshUser(): Promise<AuthUser | null> {
  try {
    const { data } = await api.get<{ user: AuthUser }>('/auth/user');
    const token = getToken();
    if (token) saveSession(token, data.user);
    return data.user;
  } catch { clearSession(); return null; }
}

const GOOGLE_AFTER_KEY = 'ct_google_after';

/** `after`: where to land once signed in — kept across the Google round trip. */
export async function loginWithGoogle(after?: string | null): Promise<void> {
  try {
    if (after) sessionStorage.setItem(GOOGLE_AFTER_KEY, after);
    else sessionStorage.removeItem(GOOGLE_AFTER_KEY);
  } catch {}
  const res = await fetch(`${API_BASE}/auth/google/redirect`);
  const data = await res.json();
  window.location.href = data.url;
}

/** The page the shopper wanted before the Google sign-in (same-site paths only), read once. */
export function takeGoogleAfter(): string | null {
  try {
    const raw = sessionStorage.getItem(GOOGLE_AFTER_KEY);
    sessionStorage.removeItem(GOOGLE_AFTER_KEY);
    return safeAfterLogin(raw);
  } catch { return null; }
}

/** Shopper whose name, phone or delivery address is missing (backend: ProfileCompletion). */
export function needsProfileCompletion(user: AuthUser | null = getUser()): boolean {
  return !!(user && user.role === 'client' && user.profile_completed === false);
}

// "Skip for now" on /complete-profile: the prompt comes back at most once every 7 days,
// and only right after signing in — never in the middle of a visit.
const PROFILE_SKIP_KEY = 'ct_profile_prompt_skipped_at';
const PROFILE_PROMPT_EVERY_MS = 7 * 24 * 60 * 60 * 1000;

function lastProfileSkip(user: AuthUser): number {
  let local = 0;
  try { local = Date.parse(localStorage.getItem(PROFILE_SKIP_KEY) ?? '') || 0; } catch {}
  const server = Date.parse(user.profile_prompt_skipped_at ?? '') || 0;
  return Math.max(local, server);
}

/** Send this shopper to /complete-profile after sign-in? */
export function shouldPromptProfile(user: AuthUser | null = getUser()): boolean {
  if (!user || !needsProfileCompletion(user)) return false;
  return Date.now() - lastProfileSkip(user) >= PROFILE_PROMPT_EVERY_MS;
}

/** Remember a skip on this device and on the account (best effort). */
export async function rememberProfileSkip(): Promise<void> {
  const now = new Date().toISOString();
  try { localStorage.setItem(PROFILE_SKIP_KEY, now); } catch {}
  const user = getUser();
  if (user) updateSessionUser({ ...user, profile_prompt_skipped_at: now });
  try { await api.post('/profile/skip-prompt'); } catch {}
}

export function needsOnboarding(): boolean {
  const user = getUser();
  return !!(user && user.role === 'client' && !user.onboarding_completed);
}