import * as XLSX from "xlsx";
import type { ParseCsvData } from "./parseCsvPurchaseOrderItems";

export async function parseExcelHeaders(file: File): Promise<ParseCsvData> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
        throw new Error(`${sheetName} file has no sheet names`);
    }

    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
        throw new Error(`${sheetName} has no sheet data`);
    }

    const allRows: Record<string, string>[] =
        XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false,
        });

    const headers = Object.keys(allRows[0] ?? {});
    const firstDataRow = allRows[0] ?? {};

    return {
        headers,
        firstDataRow,
        allRows,
    };
}