"use client";

import { ACTIVITY_TYPES, ActivityType, LogFiltersState, getLogControlValue } from "@/lib/logs/types";

interface LogsFiltersProps {
    filters: LogFiltersState;
    hasActiveFilters: boolean;
    loading: boolean;
    onFiltersChange: (filters: LogFiltersState) => void;
    onApply: () => void;
    onReset: () => void;
}

const activityOptions = ACTIVITY_TYPES.map((activity: ActivityType) => (
    <s-option key={activity} value={activity}>
        {activity}
    </s-option>
));

export function LogsFilters({
    filters,
    hasActiveFilters,
    loading,
    onFiltersChange,
    onApply,
    onReset
}: LogsFiltersProps) {
    return (
        <>
            <s-query-container>
                <s-grid gap="base" gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))">
                    <s-grid-item>
                        <s-select
                            label="Activity"
                            value={filters.activity}
                            onChange={(event: Event) => onFiltersChange({ ...filters, activity: getLogControlValue(event) as LogFiltersState["activity"] })}
                        >
                            <s-option value="">All Activities</s-option>
                            {activityOptions}
                        </s-select>
                    </s-grid-item>

                    <s-grid-item>
                        <s-date-field
                            type="single"
                            label="Date From"
                            value={filters.dateStart}
                            onChange={(event: Event) => onFiltersChange({ ...filters, dateStart: getLogControlValue(event) })}
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-date-field
                            type="single"
                            label="Date To"
                            value={filters.dateEnd}
                            onChange={(event: Event) => onFiltersChange({ ...filters, dateEnd: getLogControlValue(event) })}
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-search-field
                            label="User"
                            value={filters.user}
                            onChange={(event: Event) => onFiltersChange({ ...filters, user: (event.target as HTMLInputElement).value })}
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-search-field
                            label="Barcode"
                            value={filters.barcode}
                            onChange={(event: Event) => onFiltersChange({ ...filters, barcode: (event.target as HTMLInputElement).value })}
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-search-field
                            label="Reference Doc"
                            value={filters.referenceDoc}
                            onChange={(event: Event) => onFiltersChange({ ...filters, referenceDoc: (event.target as HTMLInputElement).value })}
                        />
                    </s-grid-item>
                </s-grid>
            </s-query-container>

            <div style={{ marginTop: "1rem" }}>
                <s-stack direction="inline" gap="small">
                    <s-button
                        onClick={onApply}
                        disabled={loading}
                        variant="primary">
                        {loading ? "Applying filters..." : "Apply filters"}
                    </s-button>
                    <s-button
                        onClick={onReset}
                        disabled={!hasActiveFilters || loading}
                        variant="secondary">
                        Reset
                    </s-button>
                </s-stack>
            </div>
        </>
    )
}