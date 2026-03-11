export type LogSortBy = "createdAt";
export type LogSortDirection = "asc" | "desc";

export const ACTIVITY_TYPES = [
    "MOVEMENT",
    "CORRECTION",
    "GOODS_RECEIPT",
    "PUTAWAY",
    "PICKING",
    "GOODS_ISSUE",
    "INV_COUNTING",
] as const;

export type ActivityType = typeof ACTIVITY_TYPES[number];

export interface LogFiltersState {
    activity: "" | ActivityType;
    user: string;
    dateStart: string;
    dateEnd: string;
    barcode: string;
    referenceDoc: string;
}

export const EMPTY_LOG_FILTERS: LogFiltersState = {
    activity: "",
    user: "",
    dateStart: "",
    dateEnd: "",
    barcode: "",
    referenceDoc: "",
};

export function getLogControlValue(event: Event): string {
    const currentTargetValue = (event.currentTarget as { value?: unknown } | null)?.value;
    if (typeof currentTargetValue === "string") {
        return currentTargetValue;
    }

    const targetValue = (event.target as { value?: unknown } | null)?.value;
    return typeof targetValue === "string" ? targetValue : "";
}

export function toLogQueryParams(
    filters: LogFiltersState,
    sortBy: LogSortBy,
    sortDirection: LogSortDirection): string {
    const params = new URLSearchParams();

    if (filters.activity) params.set("activity", filters.activity);
    if (filters.user) params.set("user", filters.user);
    if (filters.dateStart) params.set("dateStart", filters.dateStart);
    if (filters.dateEnd) params.set("dateEnd", filters.dateEnd);
    if (filters.barcode) params.set("barcode", filters.barcode);
    if (filters.referenceDoc) params.set("referenceDoc", filters.referenceDoc);
    params.set("sortBy", sortBy);
    params.set("sortDirection", sortDirection);
    return params.toString();
}