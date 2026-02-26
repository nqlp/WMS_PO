import { parseCsvHeaders } from "./parseCsvPurchaseOrderItems";
import { parseExcelHeaders } from "./parseExcelFile";
import type {
    PurchaseOrderImportParseResult,
    PurchaseOrderImportError,
    ValidatedCsvRow,
} from "./types";

/**
 * Parse a CSV or Excel file into validated purchase-order line items.
 *
 * The function auto-detects the file type by extension:
 *   .csv  → parsed with PapaParse
 *   .xlsx / .xls → parsed with SheetJS
 *
 * Expected columns (case-insensitive, after trimming):
 *   SKU, product_handle (or Product Title), Variant, qty, unit_cost
 */
export async function parsePurchaseOrderItemsFile(
    file: File,
): Promise<PurchaseOrderImportParseResult> {
    try {
        const name = file.name.toLowerCase();
        const isExcel = name.endsWith(".xlsx") || name.endsWith(".xls");

        const parsed = isExcel
            ? await parseExcelHeaders(file)
            : parseCsvHeaders(await file.text());

        if (parsed.allRows.length === 0) {
            return {
                success: false,
                errors: [{ message: "File contains no data rows." }],
            };
        }

        // --- Resolve column names (case-insensitive) ----------------------
        const headerMap = new Map<string, string>();
        for (const h of parsed.headers) {
            headerMap.set(h.toLowerCase(), h);
        }

        const col = (candidates: string[]): string | undefined => {
            for (const c of candidates) {
                const found = headerMap.get(c.toLowerCase());
                if (found) return found;
            }
            return undefined;
        };

        const skuCol = col(["sku"]);
        const productCol = col(["product_handle", "product title", "producttitle", "product"]);
        const variantCol = col(["variant", "variant title", "varianttitle"]);
        const qtyCol = col(["qty", "quantity", "order_qty", "orderqty"]);
        const costCol = col(["unit_cost", "unitcost", "cost", "price"]);

        if (!productCol && !skuCol) {
            return {
                success: false,
                errors: [{
                    message:
                        "Could not find a 'SKU' or 'product_handle' / 'Product Title' column header.",
                }],
            };
        }

        // --- Validate & convert rows --------------------------------------
        const errors: PurchaseOrderImportError[] = [];
        const parsedRows: ValidatedCsvRow[] = [];

        for (let i = 0; i < parsed.allRows.length; i++) {
            const row = parsed.allRows[i];
            if (!row) continue;

            const csvRowNumber = i + 2; // +1 for header, +1 for 1-indexing

            const sku = skuCol ? (row[skuCol] ?? "").trim() : "";
            const productTitle = productCol ? (row[productCol] ?? "").trim() : "";
            const variantTitle = variantCol ? (row[variantCol] ?? "").trim() : "";
            const rawQty = qtyCol ? (row[qtyCol] ?? "").trim() : "1";
            const rawCost = costCol ? (row[costCol] ?? "").trim() : "";

            // Validate product title
            if (!productTitle && !sku) {
                errors.push({
                    csvRowNumber,
                    field: "product_handle",
                    message: "Product title or SKU is required.",
                });
                continue;
            }

            // Validate quantity
            const qty = Number.parseInt(rawQty, 10);
            if (!Number.isFinite(qty) || qty < 1) {
                errors.push({
                    csvRowNumber,
                    field: "qty",
                    message: `Invalid quantity "${rawQty}".`,
                });
                continue;
            }

            // Validate unit cost (optional)
            let unitCost: number | null = null;
            if (rawCost) {
                const parsed = Number(rawCost);
                if (!Number.isFinite(parsed) || parsed < 0) {
                    errors.push({
                        csvRowNumber,
                        field: "unit_cost",
                        message: `Invalid unit cost "${rawCost}".`,
                    });
                    continue;
                }
                unitCost = parsed;
            }

            parsedRows.push({
                csvRowNumber,
                sku,
                productTitle,
                variantTitle,
                orderQty: qty,
                unitCost,
            });
        }

        if (errors.length > 0) {
            return { success: false, errors };
        }

        if (parsedRows.length === 0) {
            return {
                success: false,
                errors: [{ message: "No valid rows found after parsing." }],
            };
        }

        return { success: true, parsedRows };
    } catch (err: unknown) {
        return {
            success: false,
            errors: [{
                message: err instanceof Error ? err.message : "Failed to parse file.",
            }],
        };
    }
}
