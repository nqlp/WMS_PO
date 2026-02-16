import { ApiError } from '@/lib/http';
import type { AuthenticatedSession } from '@/lib/auth/session-token';
import { env } from '@/lib/env';
import { ensureOfflineAccessToken, refreshOfflineAccessToken } from '@/lib/shopify/token-exchange';

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(status: number): boolean {
  return status === 429 || (status >= 500 && status < 600);
}

function hasThrottleError<T>(payload: GraphqlResponse<T>): boolean {
  return payload.errors?.some((error) => error.extensions?.code === 'THROTTLED') ?? false;
}

async function runRequest<T>(
  session: AuthenticatedSession,
  accessToken: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<{ status: number; payload: GraphqlResponse<T> }> {
  const response = await fetch(`https://${session.shop}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Shopify-Access-Token': accessToken
    },
    body: JSON.stringify({ query, variables })
  });

  let payload: GraphqlResponse<T> = {};
  try {
    payload = (await response.json()) as GraphqlResponse<T>;
  } catch {
    // keep default empty payload
  }

  return { status: response.status, payload };
}

export async function runShopifyGraphql<T>(
  session: AuthenticatedSession,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  let accessToken = await ensureOfflineAccessToken(session);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await runRequest<T>(session, accessToken, query, variables);

    if (result.status === 401 && attempt === 0) {
      accessToken = await refreshOfflineAccessToken(session);
      continue;
    }

    if (isRetryable(result.status) || hasThrottleError(result.payload)) {
      const delayMs = Math.min(500 * 2 ** attempt, 6_000) + Math.floor(Math.random() * 250);
      await wait(delayMs);
      continue;
    }

    if (result.status >= 400) {
      throw new ApiError(result.status, result.payload.errors?.[0]?.message ?? 'Shopify GraphQL request failed');
    }

    if (result.payload.errors && result.payload.errors.length > 0) {
      throw new ApiError(400, result.payload.errors.map((error) => error.message).join('; '));
    }

    if (!result.payload.data) {
      throw new ApiError(502, 'Shopify GraphQL response missing data');
    }

    return result.payload.data;
  }

  throw new ApiError(429, 'Shopify GraphQL request retried too many times');
}
