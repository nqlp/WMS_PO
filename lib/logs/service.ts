import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { buildLogWhereQuery, LOG_SORT_COLUMN_MAP } from "@/lib/logs/filters";
import type { LogListFilters } from "@/lib/validation/logs";

export interface LogRow {
    id: string;
    createdAt: string;
    user: string | null;
    activity: string;
    barcode: string | null;
    variantTitle: string | null;
    srcLocation: string | null;
    srcQty: number | null;
    destinationLocation: string | null;
    destinationQty: number | null;
    referenceDoc: string | null;
}

export async function listLogs(filters: LogListFilters): Promise<LogRow[]> {
    const where = buildLogWhereQuery(filters);
    const sortDirection: Prisma.SortOrder = filters.sortDirection ?? "desc";

    const logs = await prisma.stockMovementLog.findMany({
        where,
        orderBy: {
            [LOG_SORT_COLUMN_MAP[filters.sortBy ?? "createdAt"]]: sortDirection,
        },
        take: 500,
    });

    return logs.map((log) => ({
        id: log.id,
        createdAt: log.createdAt.toISOString(),
        user: log.user,
        activity: log.activity,
        barcode: log.barcode,
        variantTitle: log.variantTitle,
        srcLocation: log.srcLocation,
        srcQty: log.srcQty,
        destinationLocation: log.destinationLocation,
        destinationQty: log.destinationQty,
        referenceDoc: log.referenceDoc,
    }));
}