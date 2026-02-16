'use client';

export interface ApiFetchOptions extends RequestInit {
  csrfToken?: string;
}

const APP_BRIDGE_WAIT_TIMEOUT_MS = 5000;
const APP_BRIDGE_POLL_INTERVAL_MS = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appBridgeDebugInfo(): string {
  const isEmbeddedIframe = window.self !== window.top;
  const apiKey = document.querySelector('meta[name="shopify-api-key"]')?.getAttribute('content') ?? '';
  const appBridgeScript = document.querySelector(
    'script[src="https://cdn.shopify.com/shopifycloud/app-bridge.js"]'
  );
  const url = new URL(window.location.href);
  const hasHostParam = Boolean(url.searchParams.get('host'));
  const hasShopParam = Boolean(url.searchParams.get('shop'));

  return [
    `embeddedIframe=${isEmbeddedIframe}`,
    `hasShopifyGlobal=${Boolean(window.shopify)}`,
    `hasIdTokenProvider=${Boolean(window.shopify?.idToken)}`,
    `hasApiKeyMeta=${Boolean(apiKey)}`,
    `hasAppBridgeScriptTag=${Boolean(appBridgeScript)}`,
    `hasHostParam=${hasHostParam}`,
    `hasShopParam=${hasShopParam}`
  ].join(", ");
}

async function getSessionTokenProvider(): Promise<() => Promise<string>> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < APP_BRIDGE_WAIT_TIMEOUT_MS) {
    if (window.shopify?.idToken) {
      return window.shopify.idToken;
    }

    await sleep(APP_BRIDGE_POLL_INTERVAL_MS);
  }

  throw new Error(
    `Shopify App Bridge session token provider is not available. Open the app from Shopify Admin (embedded iframe) and ensure app-bridge.js is loaded. Debug: ${appBridgeDebugInfo()}`
  );
}

async function getSessionToken(): Promise<string> {
  const idToken = await getSessionTokenProvider();
  return idToken();
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
