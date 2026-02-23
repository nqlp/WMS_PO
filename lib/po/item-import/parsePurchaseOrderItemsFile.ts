import type { PurchaseOrderImportParseResult } from "./types";
import { parseCsvPurchaseOrderItems } from "./parseCsvPurchaseOrderItems";

export async function parsePurchaseOrderItemsFile(file: File): Promise<PurchaseOrderImportParseResult> {
    const lowerName = file.name.toLowerCase();

    if (lowerName.endsWith(".csv")) {
        const content = await file.text();
        return parseCsvPurchaseOrderItems(content);
    }

    if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
        return {
            success: false,
            errors: [
                {
                    message: "Excel file format is not supported yet. Please use CSV format."
                }
            ]
        };
    }

    return {
        success: false,
        errors: [
            {
                message: "Unsupported file type. Please upload a CSV file."
            }
        ]
    };
}