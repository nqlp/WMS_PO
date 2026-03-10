"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { useEmbeddedBootstrap } from "@/lib/client/hooks";
import { PurchaseOrderTableRow } from "./PurchaseOrderTable";
import { EMPTY_FILTERS, FiltersState, SortBy, SortDirection, toQueryParams } from "./purchase-order-list-types";

export default function usePurchaseOrderList() {
    const bootstrap = useEmbeddedBootstrap();
    const [vendors, setVendors] = useState<string[]>([]);
    const [filters, setFilters] = useState<FiltersState>(EMPTY_FILTERS);
    const [sortBy, setSortBy] = useState<SortBy>("createdAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [rows, setRows] = useState<PurchaseOrderTableRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inlineErrors, setInlineErrors] = useState<Record<string, string>>({});
    const [initialized, setInitialized] = useState(false);
    const searchParams = useSearchParams();
    const createdPoNumberRow = searchParams.get("createdPoNumber")?.trim() ?? "";
    const createdPoNumber = /^\d+$/.test(createdPoNumberRow) ? createdPoNumberRow : "";
    const [createSuccessMessage, setCreateSuccessMessage] = useState<string | null>(null);

    async function loadRows(nextFilters = filters, nextSortBy = sortBy, nextSortDirection = sortDirection) {
        try {
            setLoading(true);
            setError(null);
            const query = toQueryParams(nextFilters, nextSortBy, nextSortDirection);
            const response = await apiFetch<{ purchaseOrders: PurchaseOrderTableRow[] }>(`/api/purchase-orders?${query}`);
            setRows(response.purchaseOrders);
        } catch (error) {
            console.error("Failed to load purchase orders", error);
            setError(error instanceof Error ? error.message : "Failed to load purchase orders");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (bootstrap.loading || bootstrap.error || initialized) {
            return;
        }

        let mounted = true;

        (async () => {
            try {
                const [prefsResponse, vendorsResponse] = await Promise.all([
                    apiFetch<{ filters: Record<string, unknown> | null; sorting: Record<string, unknown> | null }>("/api/user-prefs"),
                    apiFetch<{ vendors: string[] }>("/api/shopify/vendors")
                ]);

                if (!mounted) {
                    return;
                }

                setVendors(vendorsResponse.vendors);

                if (createdPoNumber) {
                    const forcedFilters: FiltersState = { ...EMPTY_FILTERS, poNumber: createdPoNumber };
                    const forcedSortBy: SortBy = "createdAt";
                    const forcedSortDirection: SortDirection = "desc";
                    setFilters(forcedFilters);
                    setSortBy(forcedSortBy);
                    setSortDirection(forcedSortDirection);
                    setCreateSuccessMessage(`Purchase order ${createdPoNumber} created successfully`);
                    const forcedQuery = toQueryParams(forcedFilters, forcedSortBy, forcedSortDirection);
                    const forcedResponse = await apiFetch<{ purchaseOrders: PurchaseOrderTableRow[] }>(
                        `/api/purchase-orders?${forcedQuery}`
                    );
                    setRows(forcedResponse.purchaseOrders);
                    return;
                }

                const prefFilters = prefsResponse.filters ?? {};
                const mergedFilters: FiltersState = {
                    status: String(prefFilters.status ?? ""),
                    vendor: String(prefFilters.vendor ?? ""),
                    expectedDateStart: String(prefFilters.expectedDateStart ?? ""),
                    expectedDateEnd: String(prefFilters.expectedDateEnd ?? ""),
                    createdAtStart: String(prefFilters.createdAtStart ?? ""),
                    createdAtEnd: String(prefFilters.createdAtEnd ?? ""),
                    importDuties:
                        prefFilters.importDuties == null
                            ? ""
                            : Boolean(prefFilters.importDuties)
                                ? 'true'
                                : 'false',
                    importType: String(prefFilters.importType ?? ""),
                    hasNotes:
                        prefFilters.hasNotes == null
                            ? ""
                            : Boolean(prefFilters.hasNotes)
                                ? "true"
                                : "false",
                    poNumber: String(prefFilters.poNumber ?? ""),
                    sku: String(prefFilters.sku ?? "")
                };

                const prefSorting = prefsResponse.sorting ?? {};
                const nextSortBy = (prefSorting.sortBy as SortBy) || 'createdAt';
                const nextSortDirection = (prefSorting.sortDirection as SortDirection) || 'desc';

                setCreateSuccessMessage(null);
                setFilters(mergedFilters);
                setSortBy(nextSortBy);
                setSortDirection(nextSortDirection);

                const query = toQueryParams(mergedFilters, nextSortBy, nextSortDirection);
                const response = await apiFetch<{ purchaseOrders: PurchaseOrderTableRow[] }>(
                    `/api/purchase-orders?${query}`
                );
                setRows(response.purchaseOrders);
            } catch (error) {
                if (mounted) {
                    setError(error instanceof Error ? error.message : "Initialization failed");
                }
            } finally {
                if (mounted) {
                    setInitialized(true);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [bootstrap.error, bootstrap.loading, initialized, createdPoNumber]);

    const hasActiveFilters = useMemo(
        () => Object.values(filters).some((value) => value !== ""),
        [filters]
    );

    async function savePreferences(
        nextFilters = filters,
        nextSortBy = sortBy,
        nextSortDirection = sortDirection
    ) {
        if (!bootstrap.csrfToken) {
            return;
        }

        await apiFetch("/api/user-prefs", {
            method: "PUT",
            csrfToken: bootstrap.csrfToken,
            body: JSON.stringify({
                filters: {
                    status: nextFilters.status || null,
                    vendor: nextFilters.vendor || null,
                    poNumber: nextFilters.poNumber || null,
                    expectedDateStart: nextFilters.expectedDateStart || null,
                    expectedDateEnd: nextFilters.expectedDateEnd || null,
                    createdAtStart: nextFilters.createdAtStart || null,
                    createdAtEnd: nextFilters.createdAtEnd || null,
                    importType: nextFilters.importType || null,
                    importDuties: nextFilters.importDuties ? nextFilters.importDuties === "true" : null,
                    hasNotes: nextFilters.hasNotes ? nextFilters.hasNotes === "true" : null
                },
                sorting: {
                    sortBy: nextSortBy,
                    sortDirection: nextSortDirection
                }
            })
        });
    }

    async function runCheckIn(poNumber: string, status: string) {
        if (!bootstrap.csrfToken) {
            return;
        }

        if (status !== "OPEN") {
            setInlineErrors((prev) => ({
                ...prev,
                [poNumber]: "Check-in is only allowed for OPEN purchase orders"
            }));
            return;
        }

        try {
            await apiFetch(`/api/purchase-orders/${poNumber}/check-in`, {
                method: "POST",
                csrfToken: bootstrap.csrfToken
            });
            setInlineErrors((prev) => ({ ...prev, [poNumber]: "" }));
            await loadRows();
        } catch (error) {
            console.error("Check-in failed for PO", poNumber, error);
            setInlineErrors((prev) => ({
                ...prev,
                [poNumber]: error instanceof Error ? error.message : "Check-in failed"
            }));
        }
    }

    function resetFilters() {
        setFilters(EMPTY_FILTERS);
        setSortBy("createdAt");
        setSortDirection("desc");
        loadRows(EMPTY_FILTERS, "createdAt", "desc");
        savePreferences(EMPTY_FILTERS, "createdAt", "desc");
    }

    return {
        // bootstrap state (needed for loading/error guards in the page)
        bootstrapLoading: bootstrap.loading,
        bootstrapError: bootstrap.error,

        // data
        rows,
        vendors,
        filters,
        sortBy,
        sortDirection,
        loading,
        error,
        initialized,
        inlineErrors,
        createSuccessMessage,
        hasActiveFilters,

        // setters
        setFilters,
        setSortBy,
        setSortDirection,

        // actions
        loadRows,
        savePreferences,
        runCheckIn,
        resetFilters,
    };
}
