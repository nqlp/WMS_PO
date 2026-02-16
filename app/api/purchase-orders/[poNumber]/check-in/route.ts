import { NextResponse } from 'next/server';

import { requireShopifySession } from '@/lib/auth/require-auth';
import { ApiError, handleRouteError } from '@/lib/http';
import { checkInPurchaseOrder } from '@/lib/po/service';

function parsePoNumber(value: string): bigint {
  try {
    return BigInt(value);
  } catch {
    throw new ApiError(400, 'Invalid po_number');
  }
}

export async function POST(
  request: Request,
  context: {
    params: Promise<{ poNumber: string }>;
  }
) {
  try {
    const session = await requireShopifySession(request);
    const params = await context.params;
    const poNumber = parsePoNumber(params.poNumber);
    const purchaseOrder = await checkInPurchaseOrder(session, poNumber);

    return NextResponse.json({
      poNumber: purchaseOrder.poNumber.toString(),
      status: purchaseOrder.status
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
