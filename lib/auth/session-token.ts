import { jwtVerify, type JWTPayload } from 'jose';

import { env } from '@/lib/env';
import { ApiError } from '@/lib/http';

export interface AuthenticatedSession {
  shop: string;
  userId: string;
  sessionToken: string;
  payload: JWTPayload;
}

const JWT_SECRET = new TextEncoder().encode(env.SHOPIFY_API_SECRET);

function extractBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new ApiError(401, "Missing Shopify session token");
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    throw new ApiError(401, "Invalid Shopify session token");
  }

  return token;
}

function extractShopFromDest(dest: string): string {
  let shopUrl: URL;
  try {
    shopUrl = new URL(dest);
  } catch {
    throw new ApiError(401, "Invalid session destination claim");
  }

  const shop = shopUrl.hostname.toLowerCase();
  if (!shop.endsWith(".myshopify.com")) {
    throw new ApiError(401, "Session token does not target a Shopify shop");
  }

  return shop;
}

export async function authenticateSessionToken(request: Request): Promise<AuthenticatedSession> {
  const sessionToken = extractBearerToken(request);

  const verification = await jwtVerify(sessionToken, JWT_SECRET, {
    algorithms: ["HS256"],
    audience: env.SHOPIFY_API_KEY
  }).catch(() => {
    throw new ApiError(401, "Session token verification failed");
  });

  const payload = verification.payload;
  const dest = payload.dest;

  if (typeof dest !== "string") {
    throw new ApiError(401, "Missing destination claim in session token");
  }

  const shop = extractShopFromDest(dest);

  return {
    shop,
    userId: typeof payload.sub === "string" ? payload.sub : shop,
    sessionToken,
    payload
  };
}
