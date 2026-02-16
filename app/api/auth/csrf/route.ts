import { NextResponse } from 'next/server';

import { createCsrfToken } from '@/lib/auth/csrf';
import { requireShopifySession } from '@/lib/auth/require-auth';
import { handleRouteError } from '@/lib/http';

export async function GET(request: Request) {
  try {
    const session = await requireShopifySession(request, { csrf: false });
    const token = createCsrfToken(session);
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    return handleRouteError(error);
  }
}
