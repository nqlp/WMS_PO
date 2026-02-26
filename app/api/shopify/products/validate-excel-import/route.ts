import { requireShopifySession } from "@/lib/auth/require-auth";
import { CsvValidationIssue, ValidatedCsvRow } from "@/lib/po/item-import/types";
import { validateSku, validateProductByHandle } from "@/lib/shopify/catalog";
import { NextResponse } from "next/server";

interface MappedRows {
    rowNumber: number;
    SKU?: string;
    sku?: string;
    product_handle?: string;
    Variant?: string;
    variant?: string;
    qty?: string;
    unit_cost?: string;
}

export async function POST(request: Request) {
    try {
        const session = await requireShopifySession(request, { csrf: false });
        const body = await request.json();
        const skuMapped = body.skuMapped;
        const productHandleMapped = body.productHandleMapped;
        const qtyMapped = body.qtyMapped;
        const unitCostMapped = body.unitCostMapped;
        const rows: MappedRows[] = body.rows;
        const issues: CsvValidationIssue[] = [];
        const validRows: ValidatedCsvRow[] = [];
        const roundToTwoDecimals = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

        for (const row of rows) {
            let resolvedSku = "";
            let resolvedProductTitle = "";
            let resolvedVariantTitle = "";
            let resolvedUnitCost: number | null = null;

            const sku = (row.SKU ?? row.sku ?? "").trim();
            const productHandle = (row.product_handle ?? "").trim();
            const variant = (row.Variant ?? row.variant ?? "").trim();
            const qty = (row.qty ?? "").trim();
            const unitCost = (row.unit_cost ?? "").trim();
            resolvedVariantTitle = variant;
            resolvedSku = sku;

            if (sku && skuMapped) {
                const matches = await validateSku(session, sku);
                const skuMatch = matches[0];

                if (!skuMatch) {
                    issues.push({
                        sku: sku,
                        rowNumber: row.rowNumber,
                        field: `${sku}`,
                        message: "SKU not found",
                        severity: "error"
                    });
                } else {
                    resolvedSku = skuMatch.sku;
                    resolvedProductTitle = skuMatch.productTitle;
                    resolvedVariantTitle = skuMatch.variantTitle;
                }
            } else {
                if (!productHandle || !productHandleMapped) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        sku,
                        field: `${productHandle}`,
                        message: "Product handle required",
                        severity: "error"
                    });
                } else {
                    try {
                        const matches = await validateProductByHandle(session, productHandle);
                        resolvedProductTitle = matches.title;
                    } catch (error) {
                        issues.push({
                            rowNumber: row.rowNumber,
                            sku,
                            field: `${productHandle}`,
                            message: "Product handle not found",
                            severity: "error"
                        });
                        console.error("Error validating product handle:", error);
                    }

                }
            }
            if (!qty || !qtyMapped) {
                issues.push({
                    rowNumber: row.rowNumber,
                    sku,
                    field: `${qty}`,
                    message: "Quantity required",
                    severity: "error"
                });
            } else {
                const qtyNumber = Number(qty);
                if (!Number.isInteger(qtyNumber) || qtyNumber < 1) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        sku,
                        field: `${qty}`,
                        message: "Quantity must be a positive integer",
                        severity: "error"
                    });
                }
            }

            if (unitCost && unitCostMapped) {
                const normalizedUnitCost = unitCost.replace(",", ".").trim();

                const parsedUnitCost = Number(normalizedUnitCost);
                if (!Number.isFinite(parsedUnitCost) || parsedUnitCost < 0) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        sku,
                        field: `${unitCost}`,
                        message: "Unit cost must be a positive number and numeric",
                        severity: "error"
                    });

                } else {
                    resolvedUnitCost = roundToTwoDecimals(parsedUnitCost);
                }
            }

            const rowHasError = issues.some((issue) => issue.rowNumber === row.rowNumber);
            if (!rowHasError) {
                validRows.push({
                    csvRowNumber: row.rowNumber,
                    sku: resolvedSku,
                    productTitle: resolvedProductTitle,
                    variantTitle: resolvedVariantTitle,
                    orderQty: Number(qty),
                    unitCost: resolvedUnitCost,
                });
            }
        }

        const hasErrors = issues.some((issue) => issue.severity === "error");
        if (hasErrors) {
            return NextResponse.json({ issues, hasErrors });
        }

        return NextResponse.json({ issues, hasErrors, validRows });
    }
    catch (error) {
        console.error("Error validating CSV import:", error);
        return NextResponse.json({ issues: [], hasErrors: true });
    }
}
