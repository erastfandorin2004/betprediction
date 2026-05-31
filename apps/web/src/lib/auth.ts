const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
const TOKEN_KEY = 'ai-score-access';
const REFRESH_KEY = 'ai-score-refresh';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { data?: T; message?: string; statusCode?: number };
  if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
  return json.data as T;
}

export async function register(email: string, password: string): Promise<AuthTokens> {
  return apiPost<AuthTokens>('/v1/auth/register', { email, password });
}

export async function login(email: string, password: string): Promise<AuthTokens> {
  return apiPost<AuthTokens>('/v1/auth/login', { email, password });
}

export async function logout(token: string): Promise<void> {
  await fetch(`${API_BASE}/v1/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
  clearTokens();
}
