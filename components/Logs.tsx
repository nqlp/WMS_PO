"use client";

import { LogRow } from "@/lib/logs/service";

type Chip =
    "primary"
    | "warning"
    | "success"
    | "info"
    | "secondary"
    | "error"
    | "default";

const activityColor: Record<string, Chip> = {
    MOVEMENT: "primary",
    CORRECTION: "warning",
    GOODS_RECEIPT: "success",
    PUTAWAY: "info",
    PICKING: "secondary",
    GOODS_ISSUE: "error",
    INV_COUNTING: "default",
};

function formatDate(iso: string) {
    return new Date(iso.toString()).toLocaleString("en-CA", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

export default function StockMovementsTable({ logs }: { logs: LogRow[] }) {
    return (
        <s-section sx={{ width: "100%" }}>
            <s-table>
                <s-table-header-row>
                    <s-table-header>Date</s-table-header>
                    <s-table-header>Activity</s-table-header>
                    <s-table-header>User</s-table-header>
                    <s-table-header>Barcode</s-table-header>
                    <s-table-header>Variant</s-table-header>
                    <s-table-header>Src Location</s-table-header>
                    <s-table-header>Src Qty</s-table-header>
                    <s-table-header>Dest Location</s-table-header>
                    <s-table-header>Dest Qty</s-table-header>
                    <s-table-header>Reference Doc</s-table-header>
                </s-table-header-row>
                <s-table-body>
                    {logs.map((log) => (
                        <s-table-row key={log.id} hover>
                            <s-table-cell>{formatDate(log.createdAt)}</s-table-cell>
                            <s-table-cell>
                                <s-chip
                                    color={activityColor[log.activity] ?? "default"}
                                    size="small"
                                >
                                    {log.activity}
                                </s-chip>
                            </s-table-cell>
                            <s-table-cell>{log.user ?? "—"}</s-table-cell>
                            <s-table-cell>{log.barcode ?? "—"}</s-table-cell>
                            <s-table-cell>{log.variantTitle ?? "—"}</s-table-cell>
                            <s-table-cell>{log.srcLocation ?? "—"}</s-table-cell>
                            <s-table-cell>{log.srcQty ?? "—"}</s-table-cell>
                            <s-table-cell>{log.destinationLocation ?? "—"}</s-table-cell>
                            <s-table-cell>{log.destinationQty ?? "—"}</s-table-cell>
                            <s-table-cell>{log.referenceDoc ?? "—"}</s-table-cell>
                        </s-table-row>
                    ))}
                </s-table-body>
            </s-table>
        </s-section>
    );
}
