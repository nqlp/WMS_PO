import { NextResponse } from 'next/server';

import { requireShopifySession } from '@/lib/auth/require-auth';
import { handleRouteError } from '@/lib/http';
import { ensureOfflineAccessToken } from '@/lib/shopify/token-exchange';

async function exchange(request: Request) {
  try {
    const session = await requireShopifySession(request, { csrf: false });
    await ensureOfflineAccessToken(session);
    return NextResponse.json({ ok: true, shop: session.shop });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function GET(request: Request) {
  return exchange(request);
}

export async function POST(request: Request) {
  return exchange(request);
}
