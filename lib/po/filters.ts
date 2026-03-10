import { ApiError } from '@/lib/http';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedSession } from '@/lib/auth/session-token';
import type { PurchaseOrderListFilters } from '@/lib/validation/po';

export type SortBy = NonNullable<PurchaseOrderListFilters["sortBy"]>;

export function parseDate(value: string | null | undefined, options: { endOfDay?: boolean } = {}): Date | null {
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

export function applyDateRange(
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

export function applyFilters(session: AuthenticatedSession, filters: PurchaseOrderListFilters): Prisma.PoHeaderWhereInput {
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

    if (filters.sku) {
        where.items = {
            some: {
                sku: {
                    contains: filters.sku,
                    mode: "insensitive"
                }
            }
        };
    }

    applyDateRange(where, "expectedDate", filters.expectedDateStart, filters.expectedDateEnd);
    applyDateRange(where, "createdAt", filters.createdAtStart, filters.createdAtEnd);

    return where;
}

export const SORT_COLUMN_MAP: Record<SortBy, keyof Prisma.PoHeaderOrderByWithRelationInput> = {
    poNumber: "poNumber",
    createdAt: "createdAt",
    expectedDate: "expectedDate",
    status: "status",
    vendor: "vendor"
};