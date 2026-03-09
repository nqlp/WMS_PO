import { NextResponse } from 'next/server';
import { requireShopifySession } from '@/lib/auth/require-auth';
import { handleRouteError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { userPrefsSchema } from '@/lib/validation/prefs';
import { parseOrThrow } from '@/lib/validation/utils';

export async function GET(request: Request) {
  try {
    const session = await requireShopifySession(request, { csrf: false });

    const prefs = await prisma.userPrefs.findUnique({
      where: {
        shop_userId: {
          shop: session.shop,
          userId: session.userId
        }
      }
    });

    return NextResponse.json({
      filters: prefs?.filters ?? null,
      sorting: prefs?.sorting ?? null
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireShopifySession(request);
    const body = (await request.json()) as unknown;
    const parsed = parseOrThrow(userPrefsSchema, body, "Invalid user preferences payload");

    const prefs = await prisma.userPrefs.upsert({
      where: {
        shop_userId: {
          shop: session.shop,
          userId: session.userId
        }
      },
      create: {
        shop: session.shop,
        userId: session.userId,
        filters: parsed.filters ?? {},
        sorting: parsed.sorting ?? {},
      },
      update: {
        filters: parsed.filters ?? {},
        sorting: parsed.sorting ?? {}
      }
    });

    return NextResponse.json({
      filters: prefs.filters,
      sorting: prefs.sorting
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
