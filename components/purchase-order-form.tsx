"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { COO_CODES, DEFAULT_CURRENCY, IMPORT_TYPES } from '@/lib/constants';
import { apiFetch } from '@/lib/client/api';
import { withEmbeddedParams } from '@/lib/client/embedded-url';
import { useEmbeddedBootstrap, useVendors } from '@/lib/client/hooks';
import { ItemGrids } from '@/components/ItemGrids';
import { CurrencyOptions } from '@/components/currency-options';
import { normalizeHsCode } from '@/lib/helper';

interface PurchaseOrderItemDto {
  poItem: number;
  sku: string | null;
  productTitle: string;
  variantTitle: string;
  orderQty: number;
  unitCost: string | number | null;
  unitCostCurrency: string;
  hsCode: string | null;
  coo: string | null;
}

export interface PurchaseOrderDto {
  poNumber: string;
  vendor: string;
  status: string;
  importDuties: boolean;
  importType: string;
  expectedDate: string | null;
  shippingFees: string | number | null;
  shippingFeesCurrency: string | null;
  notes: string | null;
  items: PurchaseOrderItemDto[];
}

export interface ProductOption {
  id: string;
  title: string;
  vendor: string;
  variants: VariantOption[];
}

export interface VariantOption {
  id: string;
  sku: string | null;
  title: string;
  variantTitle: string;
  coo: string | null;
  hsCode: string | null;
}

export interface FormLine {
  rowId: string;
  existingPoItem?: number;
  sku: string;
  productId: string | null;
  productTitle: string;
  variantId: string | null;
  variantTitle: string;
  orderQty: string;
  unitCost: string;
  unitCostCurrency: string;
  hsCode: string;
  coo: string;
  cooLocked: boolean;
  skuError: string | null;
}

interface PurchaseOrderFormProps {
  mode: "create" | "edit";
  title: string;
  initialData?: PurchaseOrderDto;
  readOnly?: boolean;
}

function lineId(): string {
  return Math.random().toString(36).slice(2, 12);
}

function emptyLine(): FormLine {
  return {
    rowId: lineId(),
    sku: "",
    productId: null,
    productTitle: "",
    variantId: null,
    variantTitle: "",
    orderQty: "1",
    unitCost: "",
    unitCostCurrency: DEFAULT_CURRENCY,
    hsCode: "",
    coo: "",
    cooLocked: false,
    skuError: null
  };
}

function decimalText(value: string | number | null): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "number") {
    return value.toFixed(2);
  }

  return value;
}

function eventValue(event: unknown): string {
  const currentValue = (event as { currentTarget?: { value?: unknown } }).currentTarget?.value;
  if (typeof currentValue === "string") {
    return currentValue;
  }

  if (typeof currentValue === "number") {
    return String(currentValue);
  }

  const targetValue = (event as { target?: { value?: unknown } }).target?.value;
  if (typeof targetValue === "string") {
    return targetValue;
  }

  if (typeof targetValue === "number") {
    return String(targetValue);
  }

  return "";
}

export function PurchaseOrderForm({ mode, title, initialData, readOnly = false }: PurchaseOrderFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const purchaseOrdersHref = withEmbeddedParams("/purchase-orders", searchParams);
  const bootstrap = useEmbeddedBootstrap();

  const [vendor, setVendor] = useState(initialData?.vendor ?? "");
  const { allVendorOptions, loading: loadingVendors } = useVendors(
    !bootstrap.loading && !bootstrap.error,
    vendor
  );
  const [importDuties, setImportDuties] = useState(initialData?.importDuties ?? false);
  const [importType, setImportType] = useState(initialData?.importType ?? "NO_IMPORT");
  const [expectedDate, setExpectedDate] = useState(initialData?.expectedDate?.slice(0, 10) ?? "");
  const [shippingFees, setShippingFees] = useState(decimalText(initialData?.shippingFees ?? null));
  const [shippingFeesCurrency, setShippingFeesCurrency] = useState(
    initialData?.shippingFeesCurrency ?? DEFAULT_CURRENCY
  );
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const [lines, setLines] = useState<FormLine[]>(
    initialData?.items?.length
      ? initialData.items.map((item) => ({
        rowId: lineId(),
        existingPoItem: item.poItem,
        sku: item.sku ?? "",
        productId: null,
        productTitle: item.productTitle,
        variantId: null,
        variantTitle: item.variantTitle,
        orderQty: String(item.orderQty),
        unitCost: decimalText(item.unitCost),
        unitCostCurrency: item.unitCostCurrency ?? DEFAULT_CURRENCY,
        hsCode: normalizeHsCode(item.hsCode) ?? "",
        coo: item.coo ?? "",
        cooLocked: false,
        skuError: null
      }))
      : [emptyLine()]
  );

  const [productSuggestions, setProductSuggestions] = useState<Record<string, ProductOption[]>>({});
  const [variantPool, setVariantPool] = useState<Record<string, VariantOption[]>>({});
  const [activeProductPopoverRowId, setActiveProductPopoverRowId] = useState<string | null>(null);
  const [activeVariantPopoverRowId, setActiveVariantPopoverRowId] = useState<string | null>(null);
  const [activeCooPopoverRowId, setActiveCooPopoverRowId] = useState<string | null>(null);
  const [validatingSkuRows, setValidatingSkuRows] = useState<Set<string>>(new Set());
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const immutableBySku = useMemo(
    () => new Set(lines.filter((line) => line.sku.trim()).map((line) => line.rowId)),
    [lines]
  );
  const isSkuValidationLoading = validatingSkuRows.size > 0;

  useEffect(() => {
    document.body.classList.toggle("sku-loading-cursor", isSkuValidationLoading);

    return () => {
      document.body.classList.remove("sku-loading-cursor");
    };
  }, [isSkuValidationLoading]);

  function updateLine(rowId: string, updater: (line: FormLine) => FormLine) {
    setLines((prev) => prev.map((line) => (line.rowId === rowId ? updater(line) : line)));
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(rowId: string) {
    setLines((prev) => {
      if (prev.length <= 1) {
        return prev;
      }
      return prev.filter((line) => line.rowId !== rowId);
    });
    setProductSuggestions((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    setVariantPool((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    setActiveProductPopoverRowId((prev) => (prev === rowId ? null : prev));
    setActiveVariantPopoverRowId((prev) => (prev === rowId ? null : prev));
    setActiveCooPopoverRowId((prev) => (prev === rowId ? null : prev));
  }

  async function validateSkuForLine(rowId: string) {
    const row = lines.find((line) => line.rowId === rowId);
    if (!row) {
      return;
    }

    const sku = row.sku.trim();
    if (!sku) {
      updateLine(rowId, (line) => ({ ...line, skuError: null }));
      return;
    }

    try {
      setValidatingSkuRows((prev) => {
        const next = new Set(prev);
        next.add(rowId);
        return next;
      });
      const payload = await apiFetch<{
        matches: Array<{
          variantId: string;
          sku: string;
          productId: string;
          productTitle: string;
          variantTitle: string;
          coo: string | null;
          hsCode: string | null;
        }>;
        count: number;
      }>(`/api/shopify/variants/validate-sku?sku=${encodeURIComponent(sku)}`);

      if (payload.count === 0) {
        updateLine(rowId, (line) => ({
          ...line,
          variantId: null,
          hsCode: "",
          coo: "",
          cooLocked: false,
          skuError: "SKU not found in Shopify variants"
        }));
        return;
      }

      if (payload.count > 1) {
        updateLine(rowId, (line) => ({
          ...line,
          variantId: null,
          coo: "",
          cooLocked: false,
          hsCode: "",
          skuError: "SKU matched multiple variants"
        }));
        return;
      }

      const [match] = payload.matches;
      if (!match) {
        updateLine(rowId, (line) => ({
          ...line,
          variantId: null,
          coo: "",
          cooLocked: false,
          hsCode: "",
          skuError: "SKU validation returned no match"
        }));
        return;
      }

      updateLine(rowId, (line) => ({
        ...line,
        sku: match.sku,
        productId: match.productId,
        productTitle: match.productTitle,
        variantId: match.variantId,
        variantTitle: match.variantTitle,
        coo: match.coo ?? "",
        cooLocked: Boolean(match.coo),
        hsCode: normalizeHsCode(match.hsCode) ?? "",
        skuError: null
      }));

      setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      setVariantPool((prev) => ({ ...prev, [rowId]: [] }));
      setActiveProductPopoverRowId((prev) => (prev === rowId ? null : prev));
      setActiveVariantPopoverRowId((prev) => (prev === rowId ? null : prev));
      setActiveCooPopoverRowId((prev) => (prev === rowId ? null : prev));
    } catch (error) {
      console.error("Error validating SKU", error);
      updateLine(rowId, (line) => ({
        ...line,
        skuError: error instanceof Error ? error.message : "Unable to validate SKU"
      }));
    } finally {
      setValidatingSkuRows((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }
  }

  async function searchProducts(rowId: string, query: string) {
    if (query.trim().length < 2) {
      setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      setActiveProductPopoverRowId((prev) => (prev === rowId ? null : prev));
      return;
    }

    try {
      const payload = await apiFetch<{ products: ProductOption[] }>(
        `/api/shopify/products/search?q=${encodeURIComponent(query)}`
      );
      setProductSuggestions((prev) => ({ ...prev, [rowId]: payload.products }));
      setActiveProductPopoverRowId(rowId);
    } catch {
      setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      setActiveProductPopoverRowId((prev) => (prev === rowId ? null : prev));
    }
  }

  async function selectProduct(rowId: string, product: ProductOption) {
    updateLine(rowId, (line) => ({
      ...line,
      productId: product.id,
      productTitle: product.title,
      variantId: null,
      variantTitle: "",
      coo: "",
      cooLocked: false,
      hsCode: ""
    }));

    setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
    setActiveProductPopoverRowId((prev) => (prev === rowId ? null : prev));

    try {
      const payload = await apiFetch<{ variants: VariantOption[] }>(
        `/api/shopify/products/${encodeURIComponent(product.id)}/variants`
      );
      setVariantPool((prev) => ({ ...prev, [rowId]: payload.variants }));
    } catch {
      setVariantPool((prev) => ({ ...prev, [rowId]: product.variants ?? [] }));
    }
  }

  function selectVariant(rowId: string, variant: VariantOption) {
    updateLine(rowId, (line) => ({
      ...line,
      variantId: variant.id,
      variantTitle: variant.variantTitle,
      sku: line.sku || variant.sku || "",
      coo: variant.coo ?? "",
      cooLocked: Boolean(variant.coo),
      hsCode: normalizeHsCode(variant.hsCode) ?? "",
      skuError: null
    }));
    setActiveVariantPopoverRowId((prev) => (prev === rowId ? null : prev));
  }

  function validateBeforeSubmit(): boolean {
    setSubmitError(null);
    setHeaderError(null);

    if (!vendor.trim()) {
      setHeaderError("Vendor is required");
      return false;
    }

    if (lines.length === 0) {
      setSubmitError("At least one line item is required");
      return false;
    }

    for (const [index, line] of lines.entries()) {
      if (line.skuError) {
        setSubmitError(`Line ${index + 1}: ${line.skuError}`);
        return false;
      }

      if (!line.productTitle.trim()) {
        setSubmitError(`Line ${index + 1}: Product title is required`);
        return false;
      }

      if (!line.variantTitle.trim()) {
        setSubmitError(`Line ${index + 1}: Variant title is required`);
        return false;
      }

      const qty = Number.parseInt(line.orderQty, 10);
      if (!Number.isInteger(qty) || qty < 1) {
        setSubmitError(`Line ${index + 1}: Order quantity must be an integer >= 1`);
        return false;
      }

      if (line.unitCost.trim()) {
        const money = Number(line.unitCost);
        if (!Number.isFinite(money) || money < 0) {
          setSubmitError(`Line ${index + 1}: Unit cost must be >= 0`);
          return false;
        }
      }

      const coo = line.coo.trim().toUpperCase();
      if (coo && coo.length !== 2) {
        setSubmitError(`Line ${index + 1}: COO must be 2 characters`);
        return false;
      }

      if (coo && !COO_CODES.includes(coo)) {
        setSubmitError(`Line ${index + 1}: COO must be a valid ISO country code`);
        return false;
      }
    }

    if (shippingFees.trim()) {
      const money = Number(shippingFees);
      if (!Number.isFinite(money) || money < 0) {
        setHeaderError("Shipping fees must be >= 0");
        return false;
      }
    }

    return true;
  }

  async function submit() {
    if (readOnly || submitting || bootstrap.loading) {
      return;
    }

    if (!bootstrap.csrfToken) {
      setSubmitError("Creation failed: missing CSRF token. Reload the page and open the app from Shopify Admin.");
      return;
    }

    if (!validateBeforeSubmit()) {
      return;
    }

    const payload = {
      header: {
        vendor: vendor.trim(),
        importDuties,
        importType,
        expectedDate: expectedDate || null,
        shippingFees: shippingFees.trim() ? Number(shippingFees) : null,
        shippingFeesCurrency: shippingFeesCurrency || DEFAULT_CURRENCY,
        notes: notes.trim() || null
      },
      items: lines.map((line) => ({
        existingPoItem: line.existingPoItem,
        sku: line.sku.trim() || null,
        productTitle: line.productTitle.trim(),
        variantTitle: line.variantTitle.trim(),
        orderQty: Number.parseInt(line.orderQty, 10),
        unitCost: line.unitCost.trim() ? Number(line.unitCost) : null,
        unitCostCurrency: line.unitCostCurrency || DEFAULT_CURRENCY,
        hsCode: line.hsCode.trim() || null,
        coo: line.coo.trim().toUpperCase() || null
      }))
    };

    try {
      setSubmitting(true);
      setSuccessMessage(null);
      if (mode === "create") {
        const created = await apiFetch<{ poNumber: string }>("/api/purchase-orders", {
          method: "POST",
          csrfToken: bootstrap.csrfToken,
          body: JSON.stringify(payload)
        });

        setSuccessMessage(`Purchase order #${created.poNumber} created successfully.`);

        const nextListHref = withEmbeddedParams(`/purchase-orders?createdPoNumber=${encodeURIComponent(created.poNumber)}`, searchParams);
        router.push(nextListHref);
        router.refresh();
      } else {
        const poNumber = initialData?.poNumber;
        if (!poNumber) {
          throw new Error("Missing purchase order number");
        }

        await apiFetch<{ purchaseOrder: PurchaseOrderDto }>(`/api/purchase-orders/${poNumber}`, {
          method: "PATCH",
          csrfToken: bootstrap.csrfToken,
          body: JSON.stringify(payload)
        });

        setSuccessMessage(`Purchase order #${poNumber} updated successfully.`);
        router.refresh();
      }
    } catch (error) {
      setSubmitError("Failed to update purchase order.");
      console.error("Error submitting purchase order form", error);
    } finally {
      setSubmitting(false);
    }
  }

  if (bootstrap.loading) {
    return (
      <s-page heading="Purchase Order Form" inlineSize="large">
        <s-section>
          <s-banner tone="info">Initializing embedded Shopify session...</s-banner>
        </s-section>
      </s-page>
    );
  }

  if (bootstrap.error) {
    return (
      <s-page heading="Purchase Order Form" inlineSize="large">
        <s-section>
          <s-banner tone="critical">{bootstrap.error}</s-banner>
        </s-section>
      </s-page>
    );
  }

  return (
    <s-page heading="Purchase Order Form" inlineSize="large" className={isSkuValidationLoading ? "is-sku-loading" : undefined}>
      <s-section>
        <s-stack direction="block" gap="base">
          <s-heading>{title}</s-heading>

          {readOnly ? (
            <s-banner tone="info">
              This purchase order is archived and cannot be modified. Fields are shown in read-only mode.
            </s-banner>
          ) : null}
          {(headerError || submitError) ? (
            <s-banner tone="critical">{submitError ?? headerError}</s-banner>
          ) : null}
          {successMessage ? <s-banner tone="success">{successMessage}</s-banner> : null}

          <s-query-container>
            <s-grid
              gap="base"
              gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
            >
              <s-grid-item>
                <s-select label="Vendor" value={vendor} disabled={readOnly} onChange={(event: Event) => setVendor(eventValue(event))}>
                  <s-option value="">
                    {loadingVendors ? "Loading vendors..." : "Select Vendor"}
                  </s-option>
                  {allVendorOptions.map((option) => (
                    <s-option key={option} value={option}>
                      {option}
                    </s-option>
                  ))}
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Import Duties"
                  value={importDuties ? "true" : "false"}
                  disabled={readOnly}
                  onChange={(event: Event) => setImportDuties(eventValue(event) === "true")}
                >
                  <s-option value="false">No</s-option>
                  <s-option value="true">Yes</s-option>
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Import Type"
                  value={importType}
                  disabled={readOnly}
                  onChange={(event: Event) => setImportType(eventValue(event))}
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
                  value={expectedDate}
                  disabled={readOnly}
                  style={{ inlineSize: "100%" }}
                  onChange={(event: Event) => setExpectedDate(eventValue(event))}
                />
              </s-grid-item>

              <s-grid-item>
                <s-number-field
                  label="Shipping Fees"
                  value={shippingFees}
                  min="0"
                  step="0.01"
                  disabled={readOnly}
                  onInput={(event: Event) => setShippingFees(eventValue(event))}
                />
              </s-grid-item>

              <s-grid-item>
                <s-select
                  label="Shipping Fees Currency"
                  value={shippingFeesCurrency}
                  disabled={readOnly}
                  onChange={(event: Event) => setShippingFeesCurrency(eventValue(event))}
                >
                  <CurrencyOptions />
                </s-select>
              </s-grid-item>

              <s-grid-item>
                <s-text-area
                  label="Notes"
                  value={notes}
                  disabled={readOnly}
                  onInput={(event: Event) => setNotes(eventValue(event))}
                />
              </s-grid-item>
            </s-grid>
          </s-query-container>
        </s-stack>
      </s-section>
      <ItemGrids
        readOnly={readOnly}
        lines={lines}
        immutableBySku={immutableBySku}
        variantPool={variantPool}
        productSuggestions={productSuggestions}
        activeProductPopoverRowId={activeProductPopoverRowId}
        activeVariantPopoverRowId={activeVariantPopoverRowId}
        addLine={addLine}
        removeLine={removeLine}
        updateLine={updateLine}
        validateSkuForLine={validateSkuForLine}
        searchProducts={searchProducts}
        selectProduct={selectProduct}
        selectVariant={selectVariant}
        setActiveProductPopoverRowId={setActiveProductPopoverRowId}
        setActiveVariantPopoverRowId={setActiveVariantPopoverRowId}
        activeCooPopoverRowId={activeCooPopoverRowId}
        setActiveCooPopoverRowId={setActiveCooPopoverRowId}
      />
      <s-stack direction="inline" gap="small">
        {!readOnly ? (
          <s-button type="submit" variant="primary" onClick={() => submit()} disabled={submitting}>
            {submitting ? "Saving..." : mode === "create" ? "Create Purchase Order" : "Save Changes"}
          </s-button>
        ) : null}
        <s-button
          variant="secondary"
          onClick={() => {
            router.push(purchaseOrdersHref);
          }}
        >
          Back to list
        </s-button>
      </s-stack>
    </s-page>
  );
}
