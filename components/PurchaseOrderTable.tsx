"use client";

import { PoTableHeaders } from '@/components/PurchaseOrderUIOptions';

function statusClass(status: string): string {
    switch (status) {
        case "OPEN":
            return "status-pill status-open";
        case "CHECKEDIN":
        case "PART_RECEIVED":
        case "RECEIVED":
            return "status-pill status-checkedin";
        case "CLOSED":
        case "ARCHIVED":
            return "status-pill status-closed";
        default:
            return "status-pill status-error";
    }
}

function formatDate(value: string | null): string {
    if (!value) {
        return "";
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return value;
    }

    return parsed.toLocaleString();
}

export interface PurchaseOrderTableRow {
    poNumber: string;
    itemCount: number;
    pieces: number;
    status: string;
    createdAt: string;
    lastModification: string | null;
    expectedDate: string | null;
    importDuties: boolean;
    importType: string;
    notes: string | null;
    vendor: string;
}

interface PurchaseOrderTableProps {
    rows: PurchaseOrderTableRow[];
    inlineErrors: Record<string, string>;
    onCheckIn: (row: PurchaseOrderTableRow) => void | Promise<void>;
    onModify: (row: PurchaseOrderTableRow) => void;
}

export function PurchaseOrderTable({ rows, inlineErrors, onCheckIn, onModify }: PurchaseOrderTableProps) {
    return (
        <s-section>
            <s-table>
                <s-table-header-row>
                    <PoTableHeaders />
                </s-table-header-row>
                <s-table-body>
                    {rows.map((row) => (
                        <s-table-row key={row.poNumber}>
                            <s-table-cell>{row.poNumber}</s-table-cell>
                            <s-table-cell>{row.vendor}</s-table-cell>
                            <s-table-cell>{row.itemCount}</s-table-cell>
                            <s-table-cell>{row.pieces}</s-table-cell>
                            <s-table-cell>
                                <span className={statusClass(row.status)}>{row.status}</span>
                            </s-table-cell>
                            <s-table-cell>{formatDate(row.createdAt)}</s-table-cell>
                            <s-table-cell>{formatDate(row.lastModification)}</s-table-cell>
                            <s-table-cell>{formatDate(row.expectedDate)}</s-table-cell>
                            <s-table-cell>{row.importDuties ? "Yes" : "No"}</s-table-cell>
                            <s-table-cell>{row.importType}</s-table-cell>
                            <s-table-cell>{row.notes ? "X" : ""}</s-table-cell>
                            <s-table-cell>
                                <s-stack direction="inline" gap="small">
                                    <s-button
                                        variant="secondary"
                                        onClick={() => {
                                            void onCheckIn(row);
                                        }}
                                    >
                                        Check-in
                                    </s-button>

                                    <s-button
                                        variant="primary"
                                        onClick={() => {
                                            onModify(row);
                                        }}
                                    >
                                        Modify
                                    </s-button>
                                </s-stack>
                                {inlineErrors[row.poNumber] ? (
                                    <div className="error-text">{inlineErrors[row.poNumber]}</div>
                                ) : null}
                            </s-table-cell>
                        </s-table-row>
                    ))}
                </s-table-body>
            </s-table>
        </s-section>
    );
}