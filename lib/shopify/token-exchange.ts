import { decryptAccessToken, encryptAccessToken } from '@/lib/crypto/token-encryption';
import { env } from '@/lib/env';
import { ApiError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import type { AuthenticatedSession } from '@/lib/auth/session-token';

interface TokenExchangeResponse {
  access_token: string;
  scope?: string;
}

async function runTokenExchange(shop: string, sessionToken: string): Promise<TokenExchangeResponse> {
  const body = new URLSearchParams({
    client_id: env.SHOPIFY_API_KEY,
    client_secret: env.SHOPIFY_API_SECRET,
    grant_type: 'urn:ietf:params:oauth:grant-type:token-exchange',
    subject_token: sessionToken,
    subject_token_type: 'urn:ietf:params:oauth:token-type:id_token',
    requested_token_type: 'urn:shopify:params:oauth:token-type:offline-access-token'
  });

  const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body
  });

  if (!response.ok) {
    const text = await response.text();
    throw new ApiError(response.status, `Shopify token exchange failed: ${text}`);
  }

  return (await response.json()) as TokenExchangeResponse;
}

export async function ensureOfflineAccessToken(session: AuthenticatedSession): Promise<string> {
  const existing = await prisma.shopInstallation.findUnique({
    where: { shop: session.shop }
  });

  if (existing) {
    try {
      return decryptAccessToken(existing.encryptedAccessToken);
    } catch {
      return refreshOfflineAccessToken(session);
    }
  }

  const exchange = await runTokenExchange(session.shop, session.sessionToken);

  await prisma.shopInstallation.upsert({
    where: { shop: session.shop },
    create: {
      shop: session.shop,
      encryptedAccessToken: encryptAccessToken(exchange.access_token),
      scopes: exchange.scope ?? null
    },
    update: {
      encryptedAccessToken: encryptAccessToken(exchange.access_token),
      scopes: exchange.scope ?? null
    }
  });

  return exchange.access_token;
}

export async function refreshOfflineAccessToken(session: AuthenticatedSession): Promise<string> {
  const exchange = await runTokenExchange(session.shop, session.sessionToken);

  await prisma.shopInstallation.upsert({
    where: { shop: session.shop },
    create: {
      shop: session.shop,
      encryptedAccessToken: encryptAccessToken(exchange.access_token),
      scopes: exchange.scope ?? null
    },
    update: {
      encryptedAccessToken: encryptAccessToken(exchange.access_token),
      scopes: exchange.scope ?? null
    }
  });

  return exchange.access_token;
}
