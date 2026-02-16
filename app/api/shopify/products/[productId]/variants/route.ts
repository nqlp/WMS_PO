import { NextResponse } from 'next/server';

import { requireShopifySession } from '@/lib/auth/require-auth';
import { handleRouteError } from '@/lib/http';
import { getProductVariants } from '@/lib/shopify/catalog';

export async function GET(
  request: Request,
  context: {
    params: Promise<{ productId: string }>;
  }
) {
  try {
    const session = await requireShopifySession(request, { csrf: false });
    const { productId } = await context.params;
    const decodedProductId = decodeURIComponent(productId);
    const variants = await getProductVariants(session, decodedProductId);
    return NextResponse.json({ variants });
  } catch (error) {
    return handleRouteError(error);
  }
}
