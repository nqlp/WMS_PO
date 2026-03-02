export interface ValidatedCsvRow {
    csvRowNumber: number;
    sku: string;
    productTitle: string;
    variantTitle: string;
    orderQty: number;
    unitCost: number | null;
}

export interface PurchaseOrderImportError {
    csvRowNumber?: number;
    field?: string;
    message: string;
}

export type PurchaseOrderImportParseResult =
    | {
        success: true;
        parsedRows: ValidatedCsvRow[];
    }
    | {
        success: false;
        errors: PurchaseOrderImportError[];
    };

export type CsvTargetField = "sku" | "product_handle" | "variant" | "qty" | "unit_cost";

export const TARGET_FIELDS: CsvTargetField[] = ["sku", "product_handle", "variant", "qty", "unit_cost"];

export type CsvColumnMapping = {
    csvColumn: string,
    targetField: CsvTargetField | null,
}

export type CsvValidationIssue = {
    rowNumber: number;
    sku: string;
    field: string;
    message: string;
    severity: "error" | "warning";
}

export type CsvValidationResult = {
    issues: CsvValidationIssue[];
    hasErrors: boolean;
    validRows?: ValidatedCsvRow[];
}