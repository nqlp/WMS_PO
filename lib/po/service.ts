import type { PoHeader, PoItem, Prisma } from '@prisma/client';
import { verifyProductTitlesExist } from '../shopify/catalog';
import type { AuthenticatedSession } from '@/lib/auth/session-token';
import { ApiError } from '@/lib/http';
import { prisma } from '@/lib/prisma';
import { resolveUserDisplay } from '@/lib/shopify/user-actor';
import type {
  CreatePurchaseOrderInput,
  PurchaseOrderLineInput,
  PurchaseOrderListFilters,
  UpdatePurchaseOrderInput
} from '@/lib/validation/po';

type PoHeaderWithItems = PoHeader & { items: PoItem[] };
type SortBy = NonNullable<PurchaseOrderListFilters["sortBy"]>;

function parseDate(value: string | null | undefined, options: { endOfDay?: boolean } = {}): Date | null {
  if (!value) {
    return null;
  }

  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(isDateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, `Invalid date value: ${value}`);
  }

  if (options.endOfDay && isDateOnly) {
    parsed.setUTCHours(23, 59, 59, 999);
  }

  return parsed;
}

function parseNullableText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function serializePurchaseOrder(header: PoHeaderWithItems) {
  return {
    ...header,
    poNumber: header.poNumber.toString(),
    items: header.items.map((item) => ({
      ...item,
      poNumber: item.poNumber.toString()
    }))
  };
}

function toItemCreateInput(
  poNumber: bigint,
  line: PurchaseOrderLineInput,
  poItem: number,
  now: Date,
  modificationUser: string,
  carryForward?: { receivedQty: number | null; status: string; lastReceivingDate: Date | null }
): Prisma.PoItemCreateManyInput {
  const receivedQty = carryForward?.receivedQty ?? 0;

  if (receivedQty != null && receivedQty > line.orderQty) {
    throw new ApiError(400, `received_qty cannot exceed order_qty for line ${poItem}`);
  }

  return {
    poNumber,
    poItem,
    productTitle: line.productTitle,
    variantTitle: line.variantTitle,
    sku: parseNullableText(line.sku),
    orderQty: line.orderQty,
    receivedQty,
    status: carryForward?.status ?? "OPEN",
    unitCost: line.unitCost ?? null,
    lastReceivingDate: carryForward?.lastReceivingDate ?? null,
    lastModification: now,
    lastModificationUser: modificationUser
  };
}

export async function createPurchaseOrder(session: AuthenticatedSession, input: CreatePurchaseOrderInput) {
  const now = new Date();
  const createdBy = await resolveUserDisplay(session);

  const productTitles = input.items.map((line) => line.productTitle);
  const { invalidTitles } = await verifyProductTitlesExist(session, productTitles);

  if (invalidTitles.length > 0) {
    throw new ApiError(422, `The following product titles do not exist in the catalog: ${invalidTitles.join(', ')}`);
  }
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

function applyDateRange(
  where: Prisma.PoHeaderWhereInput,
  field: "expectedDate" | "createdAt",
  startValue?: string,
  endValue?: string
) {
  const start = parseDate(startValue);
  const end = parseDate(endValue, { endOfDay: field === "createdAt" });

  if (!start && !end) {
    return;
  }

  where[field] = {
    ...(start ? { gte: start } : {}),
    ...(end ? { lte: end } : {})
  };
}

function applyFilters(session: AuthenticatedSession, filters: PurchaseOrderListFilters): Prisma.PoHeaderWhereInput {
  const where: Prisma.PoHeaderWhereInput = {
    scope: {
      is: {
        shop: session.shop
      }
    }
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.vendor) {
    where.vendor = {
      equals: filters.vendor,
      mode: "insensitive"
    };
  }

  if (filters.poNumber) {
    where.poNumber = filters.poNumber;
  }

  if (typeof filters.importDuties === "boolean") {
    where.importDuties = filters.importDuties;
  }

  if (filters.importType) {
    where.importType = filters.importType;
  }

  if (typeof filters.hasNotes === "boolean") {
    if (filters.hasNotes) {
      where.AND = [{ notes: { not: null } }, { notes: { not: "" } }];
    } else {
      where.OR = [{ notes: null }, { notes: "" }];
    }
  }

  applyDateRange(where, "expectedDate", filters.expectedDateStart, filters.expectedDateEnd);
  applyDateRange(where, "createdAt", filters.createdAtStart, filters.createdAtEnd);

  return where;
}

const SORT_COLUMN_MAP: Record<SortBy, keyof Prisma.PoHeaderOrderByWithRelationInput> = {
  poNumber: "poNumber",
  createdAt: "createdAt",
  expectedDate: "expectedDate",
  status: "status",
  vendor: "vendor"
};

export async function listPurchaseOrders(session: AuthenticatedSession, filters: PurchaseOrderListFilters) {
  const where = applyFilters(session, filters);
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

  const productTitles = input.items.map((line) => line.productTitle);
  const { invalidTitles } = await verifyProductTitlesExist(session, productTitles);

  if (invalidTitles.length > 0) {
    throw new ApiError(422, `The following product titles do not exist in the catalog: ${invalidTitles.join(", ")}`);
  }

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
