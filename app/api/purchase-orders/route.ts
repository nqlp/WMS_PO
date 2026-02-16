import { NextResponse } from 'next/server';

import { requireShopifySession } from '@/lib/auth/require-auth';
import { handleRouteError } from '@/lib/http';
import { createPurchaseOrder, listPurchaseOrders } from '@/lib/po/service';
import { createPurchaseOrderSchema, listPurchaseOrderFilterSchema } from '@/lib/validation/po';
import { parseOrThrow } from '@/lib/validation/utils';

export async function GET(request: Request) {
  try {
    const session = await requireShopifySession(request, { csrf: false });
    const url = new URL(request.url);
    const filters = parseOrThrow(
      listPurchaseOrderFilterSchema,
      Object.fromEntries(url.searchParams.entries()),
      'Invalid purchase order filters'
    );

    const purchaseOrders = await listPurchaseOrders(session, filters);
    return NextResponse.json({ purchaseOrders });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireShopifySession(request);
    const body = (await request.json()) as unknown;
    const input = parseOrThrow(createPurchaseOrderSchema, body, 'Invalid purchase order payload');
    const created = await createPurchaseOrder(session, input);

    return NextResponse.json(
      {
        poNumber: created.poNumber.toString()
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
