import { requireShopifySession } from "@/lib/auth/require-auth";
import { CsvValidationIssue, ValidatedCsvRow } from "@/lib/po/item-import/types";
import { validateSku, validateProductByHandle } from "@/lib/shopify/catalog";
import { NextResponse } from "next/server";

interface MappedRows {
    rowNumber: number;
    sku: string;
    product_handle: string;
    variant: string;
    qty: string;
    unit_cost: string;
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

        for (const row of rows) {
            let resolvedProductTitle = "";

            const sku = (row.sku ?? "").trim();
            const productHandle = (row.product_handle ?? "").trim();
            const variant = (row.variant ?? "").trim();
            const qty = (row.qty ?? "").trim();
            const unitCost = (row.unit_cost ?? "").trim();


            if (sku && skuMapped) {
                const matches = await validateSku(session, sku);
                resolvedProductTitle = matches?.[0]?.productTitle || "";
                if (matches.length === 0) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        field: "sku",
                        message: "SKU not found",
                        severity: "error"
                    });
                }
            } else {
                if (!productHandle || !productHandleMapped) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        field: "product_handle",
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
                            field: "product_handle",
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
                    field: "qty",
                    message: "Quantity required",
                    severity: "error"
                });
            } else {
                const qtyNumber = Number(qty);
                if (!Number.isInteger(qtyNumber) || qtyNumber < 1) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        field: "qty",
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
                        field: "unit_cost",
                        message: "Unit cost must be a positive number and numeric",
                        severity: "error"
                    });

                } else {
                    const decimalPart = normalizedUnitCost.split(".")[1];
                    if (decimalPart && decimalPart.length > 2) {
                        issues.push({
                            rowNumber: row.rowNumber,
                            field: "unit_cost",
                            message: "Unit cost must have at most 2 decimal places",
                            severity: "error"
                        });
                    }
                }
            }

            const rowHasError = issues.some((issue) => issue.rowNumber === row.rowNumber);
            if (!rowHasError) {
                validRows.push({
                    csvRowNumber: row.rowNumber,
                    sku: sku,
                    productTitle: resolvedProductTitle,
                    variantTitle: variant,
                    orderQty: Number(qty),
                    unitCost: unitCost ? Number(unitCost.replace(",", ".")) : null,
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