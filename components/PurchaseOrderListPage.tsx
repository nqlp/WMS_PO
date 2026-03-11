"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { withEmbeddedParams } from '@/lib/client/embedded-url';
import { PurchaseOrderTable } from '@/components/PurchaseOrderTable';
import { PurchaseOrderFilters } from '@/components/PurchaseOrderFilters';
import usePurchaseOrderList from '@/components/usePurchaseOrderList';

export function PurchaseOrderListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const list = usePurchaseOrderList();

  if (list.bootstrapLoading || !list.initialized) {
    return <div className="panel">Loading purchase order list...</div>;
  }

  if (list.bootstrapError) {
    return <div className="panel error-text">{list.bootstrapError}</div>;
  }

  return (
    <s-page heading="Purchase Order List" inlineSize="large">
      <s-section>
        <s-section-header>
          <s-heading>Purchase Order List</s-heading>
          {list.createSuccessMessage ? <s-banner tone="success">{list.createSuccessMessage}</s-banner> : null}
          {list.error ? <s-banner tone="critical" error={list.error} /> : null}
          <PurchaseOrderFilters
            filters={list.filters}
            sortBy={list.sortBy}
            sortDirection={list.sortDirection}
            vendors={list.vendors}
            hasActiveFilters={list.hasActiveFilters}
            loading={list.loading}
            onFiltersChange={list.setFilters}
            onSortByChange={list.setSortBy}
            onSortDirectionChange={list.setSortDirection}
            onApply={() => list.loadRows()}
            onReset={list.resetFilters}
            onSaveDefaults={() => void list.savePreferences()}
          />
        </s-section-header>
      </s-section>

      <PurchaseOrderTable
        rows={list.rows}
        inlineErrors={list.inlineErrors}
        onCheckIn={(row) => void list.runCheckIn(row.poNumber, row.status)}
        onModify={(row) => router.push(withEmbeddedParams(`/purchase-orders/${row.poNumber}/edit`, searchParams))}
      />
    </s-page>
  );
}
