import { useCallback, useEffect, useState } from "react";
import { LogRow } from "@/lib/logs/service";
import { apiFetch } from "@/lib/client/api";
import { EMPTY_LOG_FILTERS, LogFiltersState, toLogQueryParams } from "@/lib/logs/types";
import { useEmbeddedBootstrap } from "@/lib/client/hooks";


export const useLogsList = () => {
    const [rows, setRows] = useState<LogRow[]>([]);
    const [loading, setLoading] = useState(false);
    const bootstrap = useEmbeddedBootstrap();
    const [filters, setFilters] = useState<LogFiltersState>(EMPTY_LOG_FILTERS);
    const [error, setError] = useState<string | null>(null);
    const [initialized, setInitialized] = useState(false);

    const loadRows = useCallback(async (f = filters) => {
        setLoading(true);
        setError(null);

        try {
            const response = await apiFetch<{ logs: LogRow[] }>(`/api/logs?${toLogQueryParams(f, "createdAt", "desc")}`);
            setRows(response.logs);
        } catch (error) {
            setError(error instanceof Error ? error.message : "An unknown error occurred");
        }
        finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        if (bootstrap.loading || bootstrap.error || initialized) return;
        loadRows(EMPTY_LOG_FILTERS);
        setInitialized(true);
    }, [bootstrap.loading, bootstrap.error, initialized, loadRows]);

    const hasActiveFilters = Object.values(filters).some(value => value !== "");

    function resetFilters() {
        setFilters(EMPTY_LOG_FILTERS);
        loadRows(EMPTY_LOG_FILTERS);
    }

    return {
        rows,
        filters,
        loading,
        error,
        initialized,
        bootstrap,
        setFilters,
        loadRows,
        resetFilters,
        hasActiveFilters,
    }
}

