"use client";

import type { CsvValidationIssue, ValidatedCsvRow } from "@/lib/po/item-import/types";

interface TableValidationReportProps {
    mode: "issues" | "validRows";
    issues?: CsvValidationIssue[];
    validRows?: ValidatedCsvRow[];
}

export default function TableValidationReport({ mode, issues, validRows }: TableValidationReportProps) {
    if (mode === "issues") {
        return (
            <s-table>
                <s-table-header-row>
                    <s-table-header>Row #</s-table-header>
                    <s-table-header>SKU</s-table-header>
                    <s-table-header>Field</s-table-header>
                    <s-table-header>Message</s-table-header>
                    <s-table-header>Severity</s-table-header>
                </s-table-header-row>
                <s-table-body>
                    {issues?.map((issue, index) => (
                        <s-table-row key={`${issue.rowNumber}-${issue.field}-${index}`}>
                            <s-table-cell>{issue.rowNumber}</s-table-cell>
                            <s-table-cell>{issue.sku}</s-table-cell>
                            <s-table-cell>{issue.field}</s-table-cell>
                            <s-table-cell>{issue.message}</s-table-cell>
                            <s-table-cell>{issue.severity}</s-table-cell>
                        </s-table-row>
                    ))}
                </s-table-body>
            </s-table>
        );
    }

    return (
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
                {validRows?.map((row) => (
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
    );
}
