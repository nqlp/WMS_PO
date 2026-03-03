import { requireShopifySession } from "@/lib/auth/require-auth";
import { CsvValidationIssue, ValidatedCsvRow } from "@/lib/po/item-import/types";
import { validateSku, validateProductByHandle } from "@/lib/shopify/catalog";
import { NextResponse } from "next/server";

interface MappedRows {
    rowNumber: number;
    sku?: string;
    product_handle?: string;
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

        const uniqueSkus = skuMapped ? [...new Set(rows.filter(row => row.sku?.trim()).map(row => row.sku!.trim()))] : [];
        const uniqueProductHandles = productHandleMapped ? [...new Set(rows.filter(row => row.product_handle?.trim()).map(row => row.product_handle!.trim()))] : [];

        // Pre-fetch all SKU and product handle validations to minimize redundant API calls
        const [skuValidations, handleValidations] = await Promise.all([
            Promise.all(uniqueSkus.map(async (sku) => [sku.toLowerCase(), await validateSku(session, sku)] as const)),
            Promise.all(uniqueProductHandles.map(async (handle) => {
                try {
                    return [handle.toLowerCase(), await validateProductByHandle(session, handle)] as const;
                }
                catch (error) {
                    console.error(`Error validating product handle "${handle}":`, error);
                    return [handle.toLowerCase(), null] as const;
                }
            }))
        ]);

        const skuValidationMap = new Map(skuValidations);
        const handleValidationMap = new Map(handleValidations);

        for (const row of rows) {
            let resolvedOrMatchedSku = "";
            let resolvedOrMatchedProductTitle = "";
            let resolvedVariantTitle = "";
            let resolvedUnitCost: number | null = null;

            const sku = row.sku?.trim() ?? "";
            const productHandle = row.product_handle?.trim() ?? "";
            const variant = row.variant?.trim() ?? "";
            const qty = row.qty?.trim() ?? "";
            const unitCost = row.unit_cost?.trim() ?? "";
            resolvedVariantTitle = variant;
            resolvedOrMatchedSku = sku;

            if (sku && skuMapped) {
                const matches = skuValidationMap.get(sku.toLowerCase()) ?? [];
                const skuMatch = matches[0];

                if (!skuMatch) {
                    issues.push({
                        sku: sku,
                        rowNumber: row.rowNumber,
                        field: "sku",
                        message: "SKU not found",
                        severity: "error"
                    });
                } else {
                    resolvedOrMatchedSku = skuMatch.sku;
                    resolvedOrMatchedProductTitle = skuMatch.productTitle;
                    resolvedVariantTitle = skuMatch.variantTitle;
                }
            } else {
                if (!productHandle || !productHandleMapped) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        sku,
                        field: "product_handle",
                        message: "Product handle required",
                        severity: "error"
                    });
                } else {
                    try {
                        const product = handleValidationMap.get(productHandle.toLowerCase());
                        if (!product) {
                            throw new Error(`Product handle "${productHandle}" not found`);
                        }
                        resolvedOrMatchedProductTitle = product.title;
                    } catch (error) {
                        issues.push({
                            rowNumber: row.rowNumber,
                            sku,
                            field: "product_handle",
                            message: "Product handle not found",
                            severity: "error"
                        });
                        console.error("Error validating product handle:", error);
                    }
                }
            }
            if (!qtyMapped) {
                issues.push({
                    rowNumber: row.rowNumber,
                    sku,
                    field: "qty",
                    message: "Quantity column is not mapped",
                    severity: "error"
                });
            } else if (!qty) {
                issues.push({
                    rowNumber: row.rowNumber,
                    sku,
                    field: "qty",
                    message: "Quantity is required",
                    severity: "error"
                })
            }
            else {
                const qtyNumber = Number(qty);
                if (!Number.isInteger(qtyNumber) || qtyNumber < 1) {
                    issues.push({
                        rowNumber: row.rowNumber,
                        sku,
                        field: "qty",
                        message: "Quantity must be an integer greater than or equal to 1",
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
                        field: "unit_cost",
                        message: "Unit cost must be a positive number and numeric",
                        severity: "error"
                    });

                } else {
                    resolvedUnitCost = roundToTwoDecimals(parsedUnitCost);
                }
            }

            const rowHasError = issues.some((issue) => issue.rowNumber === row.rowNumber && issue.severity === "error");
            if (!rowHasError) {
                validRows.push({
                    csvRowNumber: row.rowNumber,
                    sku: resolvedOrMatchedSku,
                    productTitle: resolvedOrMatchedProductTitle,
                    variantTitle: resolvedVariantTitle,
                    orderQty: Number(qty),
                    unitCost: resolvedUnitCost,
                });
            }
        }

        const hasErrors = issues.some((issue) => issue.severity === "error");
        if (hasErrors) {
            return NextResponse.json({ issues, hasErrors, validRows: [] });
        }

        return NextResponse.json({ issues, hasErrors, validRows });
    }
    catch (error) {
        console.error("Error validating CSV import:", error);
        return NextResponse.json({ issues: [], hasErrors: true });
    }
}