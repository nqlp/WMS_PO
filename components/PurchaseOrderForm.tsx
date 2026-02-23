"use client";

import { ItemGrids } from '@/components/ItemGrids';
import { PurchaseOrderHeader } from '@/components/PurchaseOrderHeader';
import type { PurchaseOrderFormProps } from '@/components/po-form.types';
import { usePurchaseOrderForm } from '@/components/usePurchaseOrderForm';

export function PurchaseOrderForm({ mode, title, initialData, readOnly = false }: PurchaseOrderFormProps) {
  const form = usePurchaseOrderForm({ mode, initialData, readOnly });

  if (form.bootstrap.loading) {
    return (
      <s-page heading="Purchase Order Form" inlineSize="large">
        <s-section>
          <s-banner tone="info">Initializing embedded Shopify session...</s-banner>
        </s-section>
      </s-page>
    );
  }

  if (form.bootstrap.error) {
    return (
      <s-page heading="Purchase Order Form" inlineSize="large">
        <s-section>
          <s-banner tone="critical">{form.bootstrap.error}</s-banner>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Purchase Order Form" inlineSize="large" className={form.isSkuValidationLoading ? "is-sku-loading" : undefined}>
      <s-section>
        <s-stack direction="block" gap="base">
          <s-heading>{title}</s-heading>

          {readOnly ? (
            <s-banner tone="info">
              This purchase order is archived and cannot be modified. Fields are shown in read-only mode.
            </s-banner>
          ) : null}
          {(form.headerError || form.submitError) ? (
            <s-banner tone="critical">
              <div>
                {(form.submitError ?? form.headerError)?.split("\n").map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </s-banner>
          ) : null}
          {form.successMessage ? <s-banner tone="success">{form.successMessage}</s-banner> : null}

          <PurchaseOrderHeader readOnly={readOnly} header={form.header} vendors={form.vendors} />
        </s-stack>
      </s-section>
      <ItemGrids
        readOnly={readOnly}
        data={{
          lines: form.lines,
          immutableBySku: form.immutableBySku,
          variantSuggestions: form.variantSuggestions,
          productSuggestions: form.productSuggestions,
          variantSearchResults: form.variantSearchResults,
        }}
        popovers={{
          activeProductPopoverRowId: form.activeProductPopoverRowId,
          setActiveProductPopoverRowId: form.setActiveProductPopoverRowId,
          activeVariantPopoverRowId: form.activeVariantPopoverRowId,
          setActiveVariantPopoverRowId: form.setActiveVariantPopoverRowId,
          activeCooPopoverRowId: form.activeCooPopoverRowId,
          setActiveCooPopoverRowId: form.setActiveCooPopoverRowId,
        }}
        actions={{
          addLine: form.addLine,
          removeLine: form.removeLine,
          updateLine: form.updateLine,
          validateSkuForLine: form.validateSkuForLine,
          searchProducts: form.searchProducts,
          selectProduct: form.selectProduct,
          selectVariant: form.selectVariant,
          searchVariants: form.searchVariants,
          importItemsFromFile: form.importItemsFromFile,
        }}
      />
      <s-stack direction="inline" gap="small">
        {!readOnly ? (
          <s-button type="submit" variant="primary" onClick={() => form.submit()} disabled={form.submitting}>
            {form.submitting ? "Saving..." : mode === "create" ? "Create Purchase Order" : "Save Changes"}
          </s-button>
        ) : null}
        <s-button
          variant="secondary"
          onClick={() => {
            form.router.push(form.purchaseOrdersHref);
          }}
        >
          Back to list
        </s-button>
      </s-stack>
    </s-page>
  );
}