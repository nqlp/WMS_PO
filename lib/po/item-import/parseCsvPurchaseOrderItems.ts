import Papa from "papaparse";

import { normalizeHsCode } from "@/lib/helper";
import { COO_LABELS, CURRENCIES, DEFAULT_CURRENCY } from "@/lib/constants";
import type { ParsedPurchaseOrderImportRow, PurchaseOrderImportError, PurchaseOrderImportParseResult } from './types';

const PO_ITEM_REQUIRED_HEADERS = ["sku", "productTitle", "variantTitle", "orderQty"] as const;

function trimmedString(value: unknown): string {
    if (typeof value === "string") {
        return value.trim();
    }

    if (typeof value === "number") {
        return String(value).trim();
    }

    return "";
}

export function parseCsvPurchaseOrderItems(csvContent: string): PurchaseOrderImportParseResult {
    const parsed = Papa.parse<Record<string, unknown>>(csvContent, {
        header: true,
        skipEmptyLines: true,
        delimiter: ",",
        transformHeader: (header) => header.trim()
    });

    const errors: PurchaseOrderImportError[] = [];

    if (parsed.errors.length > 0) {
        return {
            success: false,
            errors: parsed.errors.map((error) => ({
                message: error.message,
            }))
        };
    }

    const headers = (parsed.meta.fields ?? []).map((header) => header.trim());
    for (const required of PO_ITEM_REQUIRED_HEADERS) {
        if (!headers.includes(required)) {
            errors.push({ field: required, message: `Missing required header "${required}"` });
        }
    }

    if (errors.length > 0) {
        return { success: false, errors };
    }

    const parsedRows: ParsedPurchaseOrderImportRow[] = [];

    parsed.data.forEach((row, index) => {
        const csvRowNumber = index + 2;
        const sku = trimmedString(row.sku);
        const productTitle = trimmedString(row.productTitle);
        const variantTitle = trimmedString(row.variantTitle);
        const orderQtyRaw = trimmedString(row.orderQty);
        const unitCostRaw = trimmedString(row.unitCost);
        const unitCostCurrencyRaw = trimmedString(row.unitCostCurrency);
        const hsCodeRaw = trimmedString(row.hsCode);
        const cooRaw = trimmedString(row.coo);

        const values = [sku, productTitle, variantTitle, orderQtyRaw, unitCostRaw, unitCostCurrencyRaw, hsCodeRaw, cooRaw];
        const isEmptyLine = values.every((value) => value === "");
        if (isEmptyLine) {
            return;
        }

        if (!sku) {
            errors.push({ csvRowNumber, field: "sku", message: "SKU is required" });
        }

        if (!productTitle) {
            errors.push({ csvRowNumber, field: "productTitle", message: "Product Title is required" });
        }

        if (!variantTitle) {
            errors.push({ csvRowNumber, field: "variantTitle", message: "Variant Title is required" });
        }

        const orderQty = Number(orderQtyRaw);

        // regex check to ensure orderQty is an integer (no decimals) and is >= 1
        if (!/^\d+$/.test(orderQtyRaw) || orderQty < 1) {
            errors.push({ csvRowNumber, field: "orderQty", message: "Order quantity must be an integer >= 1" });
        }

        let unitCost: number | null = null;
        if (unitCostRaw) {
            // regex accepts both "," and "." as decimal separators
            if (!/^\s*\d+([.,]\d+)?\s*$/.test(unitCostRaw)) {
                errors.push({
                    csvRowNumber,
                    field: "unitCost",
                    message: "Unit cost must be a non-negative number"
                });
            } else {
                const normalizedMoney = unitCostRaw.replace(",", ".");
                unitCost = Number(normalizedMoney);
            }
        }

        const unitCostCurrency = unitCostCurrencyRaw || DEFAULT_CURRENCY;
        if (unitCostCurrency && !CURRENCIES.includes(unitCostCurrency as (typeof CURRENCIES)[number])) {
            errors.push({
                csvRowNumber: csvRowNumber,
                field: "unitCostCurrency",
                message: `Unsupported currency: "${unitCostCurrency}". Supported currencies are: ${CURRENCIES.join(", ")}`
            });
        }

        let coo: string | null = cooRaw || null;
        if (coo) {
            coo = coo.toUpperCase();
            if (!COO_LABELS[coo]) {
                errors.push({
                    csvRowNumber,
                    field: "coo",
                    message: `Unsupported COO: "${coo}". COO must be a valid ISO 3166-1 alpha-2 country code.`
                });
            }
        }

        const hsCode = hsCodeRaw ? (normalizeHsCode(hsCodeRaw) ?? hsCodeRaw) : null;

        parsedRows.push({
            csvRowNumber,
            sku,
            productTitle,
            variantTitle,
            orderQty,
            unitCost,
            unitCostCurrency,
            coo,
            hsCode
        });
    });

    if (errors.length > 0) {
        return {
            success: false,
            errors
        }
    };

    return {
        success: true,
        parsedRows
    };
}