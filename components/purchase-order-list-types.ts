export type SortBy = "poNumber" | "createdAt" | "expectedDate" | "status" | "vendor";
export type SortDirection = "asc" | "desc";

export interface FiltersState {
    status: string;
    vendor: string;
    expectedDateStart: string;
    expectedDateEnd: string;
    createdAtStart: string;
    createdAtEnd: string;
    importDuties: "" | "true" | "false";
    importType: string;
    hasNotes: "" | "true" | "false";
    poNumber: string;
    sku: string;
}

export const EMPTY_FILTERS: FiltersState = {
    status: "",
    vendor: "",
    expectedDateStart: "",
    expectedDateEnd: "",
    createdAtStart: "",
    createdAtEnd: "",
    importDuties: "",
    importType: "",
    hasNotes: "",
    poNumber: "",
    sku: "",
};

export function getControlValue(event: Event): string {
    const currentTargetValue = (event.currentTarget as { value?: unknown } | null)?.value;
    if (typeof currentTargetValue === "string") {
        return currentTargetValue;
    }

    const targetValue = (event.target as { value?: unknown } | null)?.value;
    return typeof targetValue === "string" ? targetValue : "";
}

export function toQueryParams(filters: FiltersState, sortBy: SortBy, sortDirection: SortDirection): string {
    const params = new URLSearchParams();

    if (filters.status) params.set("status", filters.status);
    if (filters.vendor) params.set("vendor", filters.vendor);
    if (filters.expectedDateStart) params.set("expectedDateStart", filters.expectedDateStart);
    if (filters.expectedDateEnd) params.set("expectedDateEnd", filters.expectedDateEnd);
    if (filters.createdAtStart) params.set("createdAtStart", filters.createdAtStart);
    if (filters.createdAtEnd) params.set("createdAtEnd", filters.createdAtEnd);
    if (filters.importDuties) params.set("importDuties", filters.importDuties);
    if (filters.importType) params.set("importType", filters.importType);
    if (filters.hasNotes) params.set("hasNotes", filters.hasNotes);
    if (filters.poNumber) params.set("poNumber", filters.poNumber);
    if (filters.sku) params.set("sku", filters.sku);
    params.set("sortBy", sortBy);
    params.set("sortDirection", sortDirection);

    return params.toString();
}
