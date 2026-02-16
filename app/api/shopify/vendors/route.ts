import { NextResponse } from 'next/server';

import { requireShopifySession } from '@/lib/auth/require-auth';
import { handleRouteError } from '@/lib/http';
import { getVendors } from '@/lib/shopify/catalog';

export async function GET(request: Request) {
  try {
    const session = await requireShopifySession(request, { csrf: false });
    const vendors = await getVendors(session);
    return NextResponse.json({ vendors });
  } catch (error) {
    return handleRouteError(error);
  }
}
