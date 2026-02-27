"use client";

import { useState } from "react";
import type { FormLine } from "./po-form.types";
import { eventValue, lineId } from "./po-form.utils";
import type { CsvColumnMapping, CsvTargetField, CsvValidationResult } from "@/lib/po/item-import/types";
import { TARGET_FIELDS } from "@/lib/po/item-import/types";
import { applyColumnMapping } from "@/lib/po/item-import/parseCsvPurchaseOrderItems";
import { apiFetch } from "@/lib/client/api";

interface ExcelImportDialogProps {
    headers: string[];
    firstDataRow: Record<string, string>;
    allRows: Record<string, string>[];
    onImport: (lines: FormLine[]) => void;
}

export function ExcelImportDialog({
    headers,
    firstDataRow,
    allRows,
    onImport,
}: ExcelImportDialogProps) {
    const [phase, setPhase] = useState<"mapping" | "validating" | "report">("mapping");
    const [mapping, setMapping] = useState<CsvColumnMapping[]>(
        headers.map(header => ({ csvColumn: header, targetField: null }))
    );

    const [validationResult, setValidationResult] = useState<CsvValidationResult | null>(null);

    // Which target fields are already used?
    const usedTargets = mapping.map(m => m.targetField).filter(Boolean) as CsvTargetField[];

    // Is qty mapped? (required to proceed)
    const isQtyMapped = mapping.some(m => m.targetField === "qty");

    const handleValidate = async () => {
        setPhase("validating");
        setValidationResult(null);

        try {
            const skuMapped = mapping.some(m => m.targetField === "SKU")
            const productHandleMapped = mapping.some(m => m.targetField === "product_handle")
            const qtyMapped = mapping.some(m => m.targetField === "qty")
            const unitCostMapped = mapping.some(m => m.targetField === "unit_cost")
            const activeMappings = mapping.filter(m => m.targetField !== null) as { csvColumn: string; targetField: string }[];
            const mappedRows = applyColumnMapping(allRows, activeMappings);
            const rowWithNumbers = mappedRows.map((row, index) => ({
                ...row,
                rowNumber: index + 2,
            }));

            const response = await apiFetch<CsvValidationResult>("/api/shopify/products/validate-excel-import", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    rows: rowWithNumbers,
                    skuMapped,
                    productHandleMapped,
                    qtyMapped,
                    unitCostMapped,
                })
            })

            setValidationResult(response);
            setPhase("report");
        } catch (error) {
            console.error("Validation failed", error);
            setPhase("mapping");
        }
    }
    // ─── Phase 1: Column Mapping ───
    if (phase === "mapping") {
        return (
            <s-section>
                <s-stack direction="block" gap="base">
                    <s-heading>Map CSV Columns</s-heading>

                    <s-table variant="table">
                        <s-table-header-row>
                            <s-table-header>CSV Column</s-table-header>
                            <s-table-header>Value</s-table-header>
                            <s-table-header>Map To</s-table-header>
                        </s-table-header-row>
                        <s-table-body>
                            {mapping.map((col, index) => (
                                <s-table-row key={col.csvColumn}>
                                    <s-table-cell>{col.csvColumn}</s-table-cell>
                                    <s-table-cell>{firstDataRow[col.csvColumn] ?? ""}</s-table-cell>
                                    <s-table-cell>
                                        <s-select
                                            value={col.targetField ?? ""}
                                            onChange={(event: Event) => {
                                                const value = eventValue(event) || null;
                                                const newMapping = [...mapping];
                                                newMapping[index] = {
                                                    csvColumn: col.csvColumn,
                                                    targetField: value as CsvTargetField | null,
                                                };
                                                setMapping(newMapping);
                                            }}
                                        >
                                            <s-option value="">Select</s-option>
                                            {TARGET_FIELDS
                                                .filter((field) =>
                                                    !usedTargets.includes(field) || col.targetField === field
                                                )
                                                .map((field) => (
                                                    <s-option key={field} value={field}>
                                                        {field}
                                                    </s-option>
                                                ))}
                                        </s-select>
                                    </s-table-cell>
                                </s-table-row>
                            ))}
                        </s-table-body>
                    </s-table>

                    <s-stack direction="inline" gap="small">
                        <s-button
                            variant="primary"
                            disabled={!isQtyMapped}
                            onClick={() => void handleValidate()}
                        >
                            Confirm
                        </s-button>
                    </s-stack>
                </s-stack>
            </s-section>
        );
    }

    // ─── Phase 2: Validating (loading) ───
    if (phase === "validating") {
        return (
            <s-section>
                <s-stack direction="block" gap="base">
                    <s-heading>Validating...</s-heading>
                    <s-banner tone="info">Checking your data against Shopify. Please wait.</s-banner>
                </s-stack>
            </s-section>
        );
    }

    // ─── Phase 3: Validation Report ───
    return (
        <s-section>
            <s-stack direction="block" gap="base">
                <s-heading>Validation Report</s-heading>
                {(validationResult?.issues.length ?? 0) > 0 && (
                    <s-table>
                        <s-table-header-row>
                            <s-table-header>Row #</s-table-header>
                            <s-table-header>SKU</s-table-header>
                            <s-table-header>Field</s-table-header>
                            <s-table-header>Message</s-table-header>
                            <s-table-header>Severity</s-table-header>
                        </s-table-header-row>
                        <s-table-body>
                            {validationResult?.issues.map((issue) => (
                                <s-table-row key={`${issue.rowNumber}-${issue.field}`}>
                                    <s-table-cell>{issue.rowNumber}</s-table-cell>
                                    <s-table-cell>{issue.sku}</s-table-cell>
                                    <s-table-cell>{issue.field}</s-table-cell>
                                    <s-table-cell>{issue.message}</s-table-cell>
                                    <s-table-cell>{issue.severity}</s-table-cell>
                                </s-table-row>
                            ))}
                        </s-table-body>
                    </s-table>
                )}

                {(validationResult?.validRows?.length ?? 0) > 0 && (
                    <s-table>
                        <s-table-header-row>
                            <s-table-header>Row #</s-table-header>
                            <s-table-header>SKU</s-table-header>
                            <s-table-header>Product Title</s-table-header>
                            <s-table-header>Variant Title</s-table-header>
                            <s-table-header>Order Qty</s-table-header>
                            <s-table-header>Unit Cost</s-table-header>
                        </s-table-header-row>
                        <s-table-body>
                            {validationResult?.validRows?.map((row) => (
                                <s-table-row key={row.csvRowNumber}>
                                    <s-table-cell>{row.csvRowNumber}</s-table-cell>
                                    <s-table-cell>{row.sku}</s-table-cell>
                                    <s-table-cell>{row.productTitle}</s-table-cell>
                                    <s-table-cell>{row.variantTitle}</s-table-cell>
                                    <s-table-cell>{row.orderQty}</s-table-cell>
                                    <s-table-cell>{row.unitCost ?? ""}</s-table-cell>
                                </s-table-row>
                            ))}
                        </s-table-body>
                    </s-table>
                )}

            </s-stack>
            <s-stack direction="inline" gap="small">
                <s-button
                    variant="primary"
                    disabled={validationResult?.hasErrors}
                    onClick={() => {
                        if (!validationResult) return;
                        const formLine = validationResult.validRows?.map((row) => {
                            return {
                                rowId: lineId(),
                                sku: row.sku,
                                productId: null,
                                variantId: null,
                                productTitle: row.productTitle,
                                variantTitle: row.variantTitle,
                                orderQty: String(row.orderQty),
                                unitCost: row.unitCost != null ? String(row.unitCost) : "",
                                skuError: null,

                            }
                        })
                        onImport(formLine ?? []);

                    }}
                >
                    Save
                </s-button>
                <s-button
                    variant="secondary"
                    onClick={() => setPhase("mapping")}
                > Back
                </s-button>
            </s-stack>
        </s-section>
    );
}
