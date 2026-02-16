import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { env } from '@/lib/env';
import type { AuthenticatedSession } from '@/lib/auth/session-token';
import { ApiError } from '@/lib/http';

const CSRF_TTL_SECONDS = 2 * 60 * 60;

function csrfSecret(): Buffer {
  const key = Buffer.from(env.TOKEN_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes");
  }
  return key;
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payloadBase64Url: string): string {
  return createHmac('sha256', csrfSecret()).update(payloadBase64Url).digest("base64url");
}

export function createCsrfToken(session: AuthenticatedSession): string {
  const payload = JSON.stringify({
    shop: session.shop,
    userId: session.userId,
    exp: Math.floor(Date.now() / 1000) + CSRF_TTL_SECONDS,
    nonce: randomBytes(12).toString("base64url")
  });

  const payloadBase64Url = toBase64Url(payload);
  const signature = sign(payloadBase64Url);

  return `${payloadBase64Url}.${signature}`;
}

export function verifyCsrfToken(token: string, session: AuthenticatedSession): boolean {
  const split = token.split('.');
  if (split.length !== 2) {
    return false;
  }

  const payloadBase64Url = split[0];
  const providedSignature = split[1];
  if (!payloadBase64Url || !providedSignature) {
    return false;
  }
  const expectedSignature = sign(payloadBase64Url);

  const providedBuffer = Buffer.from(providedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  let payload: { shop: string; userId: string; exp: number };
  try {
    payload = JSON.parse(fromBase64Url(payloadBase64Url));
  } catch {
    return false;
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return false;
  }

  return payload.shop === session.shop && payload.userId === session.userId;
}

export function requireCsrf(request: Request, session: AuthenticatedSession): void {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return;
  }

  const csrf = request.headers.get('x-csrf-token');

  if (!csrf || !verifyCsrfToken(csrf, session)) {
    throw new ApiError(403, 'CSRF validation failed');
  }
}
