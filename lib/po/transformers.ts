import { ApiError } from '@/lib/http';
import { Prisma } from '@prisma/client';
import type { PoHeader, PoItem } from '@prisma/client';
import type { PurchaseOrderLineInput } from '@/lib/validation/po';

type PoHeaderWithItems = PoHeader & { items: PoItem[] };

export function parseNullableText(value: string | null | undefined): string | null {
    if (value == null) {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}

export function serializePurchaseOrder(header: PoHeaderWithItems) {
    return {
        ...header,
        poNumber: header.poNumber.toString(),
        items: header.items.map((item) => ({
            ...item,
            poNumber: item.poNumber.toString()
        }))
    };
}

export function toItemCreateInput(
    poNumber: bigint,
    line: PurchaseOrderLineInput,
    poItem: number,
    now: Date,
    modificationUser: string,
    carryForward?: { receivedQty: number | null; status: string; lastReceivingDate: Date | null }
): Prisma.PoItemCreateManyInput {
    const receivedQty = carryForward?.receivedQty ?? 0;

    if (receivedQty > line.orderQty) {
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