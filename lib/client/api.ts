'use client';

export interface ApiFetchOptions extends RequestInit {
  csrfToken?: string;
}

async function getSessionToken(): Promise<string> {
  if (!window.shopify?.idToken) {
    throw new Error('Shopify App Bridge session token provider is not available');
  }

  return window.shopify.idToken();
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const token = await getSessionToken();

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Accept', 'application/json');

  const method = (options.method ?? 'GET').toUpperCase();
  const hasBody = options.body != null;

  if (hasBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.csrfToken && method !== 'GET' && method !== 'HEAD') {
    headers.set('x-csrf-token', options.csrfToken);
  }

  const response = await fetch(path, {
    ...options,
    headers
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchCsrfToken(): Promise<string> {
  const data = await apiFetch<{ csrfToken: string }>('/api/auth/csrf');
  return data.csrfToken;
}

export async function ensureTokenExchange(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/api/auth/token-exchange');
}
