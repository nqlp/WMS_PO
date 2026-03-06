import { verifyProductTitlesExist } from '@/lib/shopify/catalog'; // ✅
import type { AuthenticatedSession } from '@/lib/auth/session-token';
import { ApiError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { resolveUserDisplay } from '@/lib/shopify/user-actor';
import type {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  PurchaseOrderListFilters,
} from '@/lib/validation/po';
import { parseDate, applyFilters, SORT_COLUMN_MAP, type SortBy } from '@/lib/po/filters';
import { parseNullableText, serializePurchaseOrder, toItemCreateInput } from './transformers';

export async function createPurchaseOrder(session: AuthenticatedSession, input: CreatePurchaseOrderInput) {
  const now = new Date();
  const createdBy = await resolveUserDisplay(session);

  await validatePoItems(session, input.items);
  const result = await prisma.$transaction(async (tx) => {
    const header = await tx.poHeader.create({
      data: {
        vendor: input.header.vendor,
        status: "OPEN",
        creationUser: createdBy,
        createdAt: now,
        importDuties: input.header.importDuties,
        importType: input.header.importType,
        expectedDate: parseDate(input.header.expectedDate),
        shippingFees: input.header.shippingFees ?? null,
        notes: parseNullableText(input.header.notes)
      }
    });

    await tx.poShopScope.create({
      data: {
        poNumber: header.poNumber,
        shop: session.shop
      }
    });

    await tx.poItem.createMany({
      data: input.items.map((line, index) =>
        toItemCreateInput(header.poNumber, line, index + 1, now, createdBy)
      )
    });

    return header;
  });

  return result;
}

export async function getPurchaseOrder(session: AuthenticatedSession, poNumber: bigint) {
  const header = await prisma.poHeader.findFirst({
    where: {
      poNumber,
      scope: {
        is: {
          shop: session.shop
        }
      }
    },
    include: {
      items: {
        orderBy: {
          poItem: "asc"
        }
      }
    }
  });

  if (!header) {
    throw new ApiError(404, "Purchase order not found");
  }

  return serializePurchaseOrder(header);
}

export async function updatePurchaseOrder(
  session: AuthenticatedSession,
  poNumber: bigint,
  input: UpdatePurchaseOrderInput
) {
  const now = new Date();
  const modifiedBy = await resolveUserDisplay(session);

  await validatePoItems(session, input.items);
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.poHeader.findFirst({
      where: {
        poNumber,
        scope: {
          is: {
            shop: session.shop
          }
        }
      },
      include: {
        items: true
      }
    });

    if (!existing) {
      throw new ApiError(404, "Purchase order not found");
    }

    if (existing.status === "ARCHIVED") {
      throw new ApiError(409, "Archived purchase orders are read-only");
    }

    const existingItems = new Map(existing.items.map((item) => [item.poItem, item]));

    await tx.poHeader.update({
      where: {
        poNumber
      },
      data: {
        status: input.status ?? existing.status,
        vendor: input.header.vendor,
        importDuties: input.header.importDuties,
        importType: input.header.importType,
        expectedDate: parseDate(input.header.expectedDate),
        shippingFees: input.header.shippingFees ?? null,
        notes: parseNullableText(input.header.notes)
      }
    });

    await tx.poItem.deleteMany({
      where: {
        poNumber
      }
    });

    const newItems = input.items.map((line, index) => {
      const carry = line.existingPoItem ? existingItems.get(line.existingPoItem) : undefined;
      return toItemCreateInput(poNumber, line, index + 1, now, modifiedBy, carry);
    });

    await tx.poItem.createMany({
      data: newItems
    });

    return tx.poHeader.findUnique({
      where: {
        poNumber
      },
      include: {
        items: {
          orderBy: {
            poItem: "asc"
          }
        }
      }
    });
  });

  if (!result) {
    throw new ApiError(500, "Failed to update purchase order");
  }

  return serializePurchaseOrder(result);
}

export async function checkInPurchaseOrder(session: AuthenticatedSession, poNumber: bigint) {
  const result = await prisma.$transaction(async (tx) => {
    const header = await tx.poHeader.findFirst({
      where: {
        poNumber,
        scope: {
          is: {
            shop: session.shop
          }
        }
      }
    });

    if (!header) {
      throw new ApiError(404, "Purchase order not found");
    }

    if (header.status !== "OPEN") {
      throw new ApiError(409, "Check-in is only allowed for OPEN purchase orders");
    }

    return tx.poHeader.update({
      where: { poNumber },
      data: {
        status: "CHECKEDIN"
      }
    });
  });

  return result;
}

export async function listPurchaseOrders(session: AuthenticatedSession, filters: PurchaseOrderListFilters) {
  const where: Prisma.PoHeaderWhereInput = applyFilters(session, filters);
  const sortBy: SortBy = filters.sortBy ?? "createdAt";
  const sortDirection: Prisma.SortOrder = filters.sortDirection ?? "desc";

  const headers = await prisma.poHeader.findMany({
    where,
    orderBy: {
      [SORT_COLUMN_MAP[sortBy]]: sortDirection
    },
    include: {
      items: true
    }
  });

  return headers.map((header) => {
    const itemCount = header.items.length;
    const pieces = header.items.reduce((sum, item) => sum + item.orderQty, 0);
    const lastModification = header.items.reduce<Date | null>((max, item) => {
      if (!max || item.lastModification > max) {
        return item.lastModification;
      }
      return max;
    }, null);

    return {
      poNumber: header.poNumber.toString(),
      status: header.status,
      vendor: header.vendor,
      createdAt: header.createdAt,
      expectedDate: header.expectedDate,
      importDuties: header.importDuties,
      importType: header.importType,
      notes: header.notes,
      itemCount,
      pieces,
      lastModification
    };
  });
}

async function validatePoItems(session: AuthenticatedSession, items: Array<{ productTitle: string }>): Promise<void> {
  const productTitles = items.map((line) => line.productTitle);
  const { invalidTitles } = await verifyProductTitlesExist(session, productTitles);

  if (invalidTitles.length > 0) {
    throw new ApiError(422, `The following products were not found in the catalog: ${invalidTitles.join(', ')}`);
  }
}