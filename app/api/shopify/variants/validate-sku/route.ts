import { NextResponse } from 'next/server';

import { requireShopifySession } from '@/lib/auth/require-auth';
import { ApiError, handleRouteError } from '@/lib/http';
import { validateSku } from '@/lib/shopify/catalog';

export async function GET(request: Request) {
  try {
    const session = await requireShopifySession(request, { csrf: false });
    const url = new URL(request.url);
    const sku = url.searchParams.get('sku') ?? '';

    if (!sku.trim()) {
      throw new ApiError(400, 'SKU is required');
    }

    const matches = await validateSku(session, sku);

    return NextResponse.json({
      matches,
      count: matches.length,
      isExactSingleMatch: matches.length === 1
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
