/**
 * Minimal typed fetch client. The app has ~a dozen endpoints, so a client-cache
 * dependency is not justified (charter §3): this ~60-line wrapper plus the one
 * error envelope is enough. `credentials: 'include'` sends the httpOnly session
 * cookies; the same envelope shape is parsed for every failure.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1';

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
  requestId: string;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiFetch<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
    cache: 'no-store',
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const body = data as ApiErrorBody | undefined;
    throw new ApiError(
      res.status,
      body?.error?.code ?? 'ERROR',
      body?.error?.message ?? res.statusText,
      body?.error?.details,
      body?.requestId,
    );
  }
  return data as T;
}

// --- Auth surface (Phase 1) ------------------------------------------------

export interface SessionUser {
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'AGENT' | 'ADMIN';
  fullName: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<{ user: SessionUser }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  logout: () => apiFetch<{ ok: boolean }>('/auth/logout', { method: 'POST' }),
  me: () =>
    apiFetch<{
      id: string;
      email: string;
      fullName: string;
      phone: string;
      role: string;
    }>('/auth/me'),
};
