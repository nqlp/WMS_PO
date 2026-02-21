"use client";

import { IMPORT_TYPES } from '@/lib/constants';
import { ItemGrids } from '@/components/ItemGrids';
import { CurrencyOptions } from '@/components/currency-options';
import { eventValue } from '@/components/po-form.utils';
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
            <s-banner tone="critical">{form.submitError ?? form.headerError}</s-banner>
          ) : null}
          {form.successMessage ? <s-banner tone="success">{form.successMessage}</s-banner> : null}

          <s-query-container>
            <s-grid
              gap="base"
              gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
            >
              <s-grid-item>
                <s-select label="Vendor" value={form.header.vendor} disabled={readOnly} onChange={(event: Event) => form.header.setVendor(eventValue(event))}>
                  <s-option value="">
                    {form.vendors.loading ? "Loading vendors..." : "Select Vendor"}
                  </s-option>
                  {form.vendors.allVendorOptions.map((option) => (
                    <s-option key={option} value={option}>
                      {option}
                    </s-option>
                  ))}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Import Duties"
                  value={form.header.importDuties ? "true" : "false"}
                  disabled={readOnly}
                  onChange={(event: Event) => form.header.setImportDuties(eventValue(event) === "true")}
                >
                  <s-option value="false">No</s-option>
                  <s-option value="true">Yes</s-option>
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Import Type"
                  value={form.header.importType}
                  disabled={readOnly}
                  onChange={(event: Event) => form.header.setImportType(eventValue(event))}
                >
                  {IMPORT_TYPES.map((option) => (
                    <s-option key={option} value={option}>
                      {option}
                    </s-option>
                  ))}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-date-field
                  type="single"
                  label="Expected On"
                  value={form.header.expectedDate}
                  disabled={readOnly}
                  style={{ inlineSize: "100%" }}
                  onChange={(event: Event) => form.header.setExpectedDate(eventValue(event))}
                />
              </s-grid-item>

              <s-grid-item>
                <s-number-field
                  label="Shipping Fees"
                  value={form.header.shippingFees}
                  min="0"
                  step="0.01"
                  disabled={readOnly}
                  onInput={(event: Event) => form.header.setShippingFees(eventValue(event))}
                />
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Shipping Fees Currency"
                  value={form.header.shippingFeesCurrency}
                  disabled={readOnly}
                  onChange={(event: Event) => form.header.setShippingFeesCurrency(eventValue(event))}
                >
                  <CurrencyOptions />
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-text-area
                  label="Notes"
                  value={form.header.notes}
                  disabled={readOnly}
                  onInput={(event: Event) => form.header.setNotes(eventValue(event))}
                />
              </s-grid-item>
            </s-grid>
          </s-query-container>
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
