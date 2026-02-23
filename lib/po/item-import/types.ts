export interface ParsedPurchaseOrderImportRow {
    csvRowNumber: number;
    sku: string;
    productTitle: string;
    variantTitle: string;
    orderQty: number;
    unitCost: number | null;
    unitCostCurrency: string | null;
    hsCode: string | null;
    coo: string | null;
}

export interface PurchaseOrderImportError {
    csvRowNumber?: number;
    field?: string;
    message: string;
}

export type PurchaseOrderImportParseResult =
    | {
        success: true;
        parsedRows: ParsedPurchaseOrderImportRow[];
    }
    | {
        success: false;
        errors: PurchaseOrderImportError[];
    };