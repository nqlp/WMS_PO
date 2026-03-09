import Papa from "papaparse";

export type ParseCsvData = {
    headers: string[];
    firstDataRow: Record<string, string>;
    allRows: Record<string, string>[];
}

export const applyColumnMapping = (
    rows: Record<string, string>[],
    mapping: { csvColumn: string; targetField: string }[]) => {
    return rows.map(row => {
        const mappedRow: Record<string, string> = {};
        for (const item of mapping) {
            const csvColumn = item.csvColumn;
            const targetField = item.targetField;
            mappedRow[targetField] = row[csvColumn] ?? "";
        }
        return mappedRow;
    });
}

export function parseCsvHeaders(csvContent: string): ParseCsvData {
    const parsed = Papa.parse<Record<string, string>>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
    });

    const headers = parsed.meta.fields?.map((header) => header.trim()) ?? [];
    const allRows = parsed.data.map((row) => {
        const cleaned: Record<string, string> = {};
        for (const header of headers) {
            cleaned[header] = typeof row[header] === "string" ? row[header].trim() : "";
        }
        return cleaned;
    });

    return {
        headers,
        firstDataRow: allRows[0] ?? {},
        allRows,
    };
}