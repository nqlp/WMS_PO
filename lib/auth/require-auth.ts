import { requireCsrf } from '@/lib/auth/csrf';
import { authenticateSessionToken, type AuthenticatedSession } from '@/lib/auth/session-token';

export async function requireShopifySession(
  request: Request,
  options: { csrf?: boolean } = {}
): Promise<AuthenticatedSession> {
  const session = await authenticateSessionToken(request);

  if (options.csrf ?? true) {
    requireCsrf(request, session);
  }

  return session;
}
