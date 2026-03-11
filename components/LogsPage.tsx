"use client";

import { useLogsList } from "@/components/useLogsList";
import { LogsFilters } from "@/components/LogsFilters";
import StockMovementsTable from "@/components/Logs";

export function LogsPage() {
    const list = useLogsList();

    if (list.bootstrap.loading || !list.initialized) {
        return <div className="panel">Loading logs...</div>;
    }

    if (list.bootstrap.error) {
        return <div className="panel error-text">{list.bootstrap.error}</div>;
    }

    return (
        <s-page heading="Stock Movement Logs" inlineSize="large">
            <s-section>
                <s-section-header>
                    <s-heading>Stock Movement Logs</s-heading>
                    {list.error ? <s-banner tone="critical" error={list.error} /> : null}
                </s-section-header>
                <LogsFilters
                    filters={list.filters}
                    hasActiveFilters={list.hasActiveFilters}
                    loading={list.loading}
                    onFiltersChange={list.setFilters}
                    onApply={() => list.loadRows()}
                    onReset={list.resetFilters}
                />
            </s-section>

            <StockMovementsTable logs={list.rows} />
        </s-page>
    );
}
