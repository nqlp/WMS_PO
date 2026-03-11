"use client";

import { IMPORT_TYPES, PO_HEADER_STATUS } from '@/lib/constants';
import { FiltersState, SortBy, SortDirection, getControlValue } from './purchase-order-list-types';

interface PurchaseOrderFiltersProps {
    filters: FiltersState;
    sortBy: SortBy;
    sortDirection: SortDirection;
    vendors: string[];
    hasActiveFilters: boolean;
    loading: boolean;
    onFiltersChange: (filters: FiltersState) => void;
    onSortByChange: (sortBy: SortBy) => void;
    onSortDirectionChange: (sortDirection: SortDirection) => void;
    onApply: () => void;
    onReset: () => void;
    onSaveDefaults: () => void;
}

const importDutiesOptions: Array<{ value: FiltersState["importDuties"]; label: string }> = [
    { value: "", label: "All" },
    { value: "true", label: "Yes" },
    { value: "false", label: "No" }
];

const sortByOptions: { value: SortBy; label: string }[] = [
    { value: "poNumber", label: "PO Number" },
    { value: "createdAt", label: "Creation date" },
    { value: "expectedDate", label: "Expected date" },
    { value: "status", label: "Status" },
    { value: "vendor", label: "Vendor" }
];

const sortDirectionOptions: { value: SortDirection; label: string }[] = [
    { value: "asc", label: "Ascending" },
    { value: "desc", label: "Descending" }
];

export function PurchaseOrderFilters({
    filters,
    sortBy,
    sortDirection,
    vendors,
    hasActiveFilters,
    loading,
    onFiltersChange,
    onSortByChange,
    onSortDirectionChange,
    onApply,
    onReset,
    onSaveDefaults,
}: PurchaseOrderFiltersProps) {

    const statusOptions = PO_HEADER_STATUS.map((status) => (
        <s-option key={status} value={status}>
            {status}
        </s-option>
    ));

    const vendorOptions = vendors.map((vendor) => (
        <s-option key={vendor} value={vendor}>
            {vendor}
        </s-option>
    ));

    const importTypeOptions = IMPORT_TYPES.map((importType) => (
        <s-option key={importType} value={importType}>
            {importType}
        </s-option>
    ));

    return (
        <>
            <s-query-container>
                <s-grid gap="base" gridTemplateColumns="repeat(auto-fit, minmax(220px, 1fr))">
                    <s-grid-item>
                        <s-select
                            label="Status"
                            value={filters.status}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, status: getControlValue(event) })
                            }
                        >
                            <s-option value="">All</s-option>
                            {statusOptions}
                        </s-select>
                    </s-grid-item>

                    <s-grid-item>
                        <s-select
                            label="Vendor"
                            value={filters.vendor}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, vendor: getControlValue(event) })
                            }
                        >
                            <s-option value="">All</s-option>
                            {vendorOptions}
                        </s-select>
                    </s-grid-item>

                    <s-grid-item>
                        <s-select
                            label="Import Duties"
                            value={filters.importDuties}
                            onChange={(event: Event) =>
                                onFiltersChange({
                                    ...filters,
                                    importDuties: getControlValue(event) as FiltersState["importDuties"]
                                })
                            }
                        >
                            {importDutiesOptions.map((option) => (
                                <s-option key={option.label} value={option.value}>
                                    {option.label}
                                </s-option>
                            ))}
                        </s-select>
                    </s-grid-item>
                    <s-grid-item>
                        <s-select
                            label="Import Type"
                            value={filters.importType}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, importType: getControlValue(event) })
                            }
                        >
                            <s-option value="">All</s-option>
                            {importTypeOptions}
                        </s-select>
                    </s-grid-item>

                    <s-grid-item>
                        <s-date-field
                            type="single"
                            label="Expected Date Start"
                            value={filters.expectedDateStart}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, expectedDateStart: getControlValue(event) })
                            }
                        />
                    </s-grid-item>
                    <s-grid-item>
                        <s-date-field
                            label="Expected Date End"
                            className="field"
                            type="single"
                            value={filters.expectedDateEnd}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, expectedDateEnd: getControlValue(event) })
                            }
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-date-field
                            label="Created At Start"
                            className="field"
                            type="single"
                            value={filters.createdAtStart}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, createdAtStart: getControlValue(event) })
                            }
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-date-field
                            label="Created At End"
                            className="field"
                            type="single"
                            value={filters.createdAtEnd}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, createdAtEnd: getControlValue(event) })
                            }
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-select
                            label="Has Notes"
                            value={filters.hasNotes}
                            onChange={(event: Event) =>
                                onFiltersChange({
                                    ...filters,
                                    hasNotes: getControlValue(event) as "" | "true" | "false"
                                })
                            }
                        >
                            <s-option value="">All</s-option>
                            <s-option value="true">Yes</s-option>
                            <s-option value="false">No</s-option>
                        </s-select>
                    </s-grid-item>

                    <s-grid-item>
                        <s-search-field
                            label="SKU"
                            value={filters.sku}
                            placeholder="Search by SKU"
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, sku: (event.target as HTMLInputElement).value })
                            }
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-text-field
                            label="PO Number"
                            className="field"
                            value={filters.poNumber}
                            onChange={(event: Event) =>
                                onFiltersChange({ ...filters, poNumber: (event.target as HTMLInputElement).value })
                            }
                        />
                    </s-grid-item>

                    <s-grid-item>
                        <s-select
                            label="Sort By"
                            value={sortBy}
                            onChange={(event: Event) => onSortByChange(getControlValue(event) as SortBy)}
                        >
                            {sortByOptions.map((option) => (
                                <s-option key={option.value} value={option.value}>
                                    {option.label}
                                </s-option>
                            ))}
                        </s-select>
                    </s-grid-item>

                    <s-grid-item>
                        <s-select
                            label="Sort Direction"
                            value={sortDirection}
                            onChange={(event: Event) =>
                                onSortDirectionChange(getControlValue(event) as SortDirection)
                            }
                        >
                            {sortDirectionOptions.map((option) => (
                                <s-option key={option.value} value={option.value}>
                                    {option.label}
                                </s-option>
                            ))}
                        </s-select>
                    </s-grid-item>
                </s-grid>
            </s-query-container>

            <div style={{ marginTop: "1rem" }}>
                <s-stack direction="inline" gap="small" style={{ flexWrap: "wrap" }}>
                    <s-button
                        variant="primary"
                        onClick={onApply}
                        disabled={loading}>
                        {loading ? "Applying filters..." : "Apply filters"}
                    </s-button>

                    <s-button
                        variant="secondary"
                        type="reset"
                        onClick={onReset}
                        disabled={!hasActiveFilters && sortBy === "createdAt" && sortDirection === "desc"}
                    >
                        Reset
                    </s-button>
                    <s-button variant="secondary" onClick={onSaveDefaults}>
                        Save as default
                    </s-button>
                </s-stack>
            </div>
        </>
    );
}