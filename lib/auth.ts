import axios from 'axios';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: 'seller' | 'client' | 'admin';
  is_approved: boolean;
  is_active: boolean;
  avatar: string | null;   // Google profile photo URL (or null for email users)
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

const TOKEN_KEY = 'ct_auth_token';
const USER_KEY  = 'ct_auth_user';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
}

export function clearLocalSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('ct_auth_token');
  localStorage.removeItem('ct_auth_user');
  document.cookie = 'ct_token_exists=; path=/; max-age=0; SameSite=Lax';
}

export async function login(credentials: LoginCredentials): Promise<{ user: AuthUser; redirectTo: string }> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    saveSession(data.token, data.user);
    return { user: data.user, redirectTo: '/' };
  } catch (err: any) {
    throw {
      message: err?.response?.data?.message ?? 'Unable to connect.',
      status: err?.response?.status ?? 500,
    } as AuthError;
  }
}

export async function register(credentials: RegisterCredentials): Promise<{ user: AuthUser; redirectTo: string }> {
  try {
    const { data } = await api.post<LoginResponse>('/auth/register', credentials);
    saveSession(data.token, data.user);
    return { user: data.user, redirectTo: '/' };
  } catch (err: any) {
    const validationErrors = err?.response?.data?.errors;
    const firstError = validationErrors
      ? Object.values(validationErrors as Record<string, string[]>)[0]?.[0]
      : null;
    throw {
      message: firstError ?? err?.response?.data?.message ?? 'Unable to connect.',
      status: err?.response?.status ?? 500,
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

export async function loginWithGoogle(): Promise<void> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
  const res = await fetch(`${baseUrl}/auth/google/redirect`);
  const data = await res.json();
  window.location.href = data.url;
}