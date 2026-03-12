import { Prisma } from "@prisma/client";
import { parseDate } from "@/lib/po/filters";
import type { LogListFilters } from "@/lib/validation/logs";

export const LOG_SORT_COLUMN_MAP = {
    createdAt: "createdAt",
} satisfies Record<string, keyof Prisma.StockMovementLogOrderByWithRelationInput>;

export function buildLogWhereQuery(filters: LogListFilters): Prisma.StockMovementLogWhereInput {
    const where: Prisma.StockMovementLogWhereInput = {};

    if (filters.activity) {
        where.activity = filters.activity;
    }

    if (filters.user) {
        where.user = {
            contains: filters.user,
            mode: "insensitive",
        };
    }

    if (filters.barcode) {
        where.barcode = {
            contains: filters.barcode,
            mode: "insensitive",
        };
    }

    if (filters.referenceDoc) {
        where.referenceDoc = {
            contains: filters.referenceDoc,
            mode: "insensitive",
        };
    }

    const start = parseDate(filters.dateStart);
    const end = parseDate(filters.dateEnd, {
        endOfDay: true,
    });

    if (start || end) {
        where.createdAt = {
            ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {})
        };
    }

    return where;
}
