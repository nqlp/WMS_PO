'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import { CURRENCIES, IMPORT_TYPES } from '@/lib/constants';
import { apiFetch } from '@/lib/client/api';
import { useEmbeddedBootstrap } from '@/lib/client/hooks';

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

interface ProductOption {
  id: string;
  title: string;
  vendor: string;
  variants: VariantOption[];
}

interface VariantOption {
  id: string;
  sku: string | null;
  title: string;
  variantTitle: string;
}

interface FormLine {
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
  skuError: string | null;
}

interface PurchaseOrderFormProps {
  mode: 'create' | 'edit';
  title: string;
  initialData?: PurchaseOrderDto;
  readOnly?: boolean;
}

const DEFAULT_CURRENCY = 'CAD';

function lineId(): string {
  return Math.random().toString(36).slice(2, 12);
}

function emptyLine(): FormLine {
  return {
    rowId: lineId(),
    sku: '',
    productId: null,
    productTitle: '',
    variantId: null,
    variantTitle: '',
    orderQty: '1',
    unitCost: '',
    unitCostCurrency: DEFAULT_CURRENCY,
    hsCode: '',
    coo: '',
    skuError: null
  };
}

function decimalText(value: string | number | null): string {
  if (value == null) {
    return '';
  }

  if (typeof value === 'number') {
    return value.toFixed(2);
  }

  return value;
}

export function PurchaseOrderForm({ mode, title, initialData, readOnly = false }: PurchaseOrderFormProps) {
  const router = useRouter();
  const bootstrap = useEmbeddedBootstrap();

  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [vendor, setVendor] = useState(initialData?.vendor ?? '');
  const [importDuties, setImportDuties] = useState(initialData?.importDuties ?? false);
  const [importType, setImportType] = useState(initialData?.importType ?? 'NO_IMPORT');
  const [expectedDate, setExpectedDate] = useState(initialData?.expectedDate?.slice(0, 10) ?? '');
  const [shippingFees, setShippingFees] = useState(decimalText(initialData?.shippingFees ?? null));
  const [shippingFeesCurrency, setShippingFeesCurrency] = useState(
    initialData?.shippingFeesCurrency ?? DEFAULT_CURRENCY
  );
  const [notes, setNotes] = useState(initialData?.notes ?? '');

  const [lines, setLines] = useState<FormLine[]>(
    initialData?.items?.length
      ? initialData.items.map((item) => ({
          rowId: lineId(),
          existingPoItem: item.poItem,
          sku: item.sku ?? '',
          productId: null,
          productTitle: item.productTitle,
          variantId: null,
          variantTitle: item.variantTitle,
          orderQty: String(item.orderQty),
          unitCost: decimalText(item.unitCost),
          unitCostCurrency: item.unitCostCurrency ?? DEFAULT_CURRENCY,
          hsCode: item.hsCode ?? '',
          coo: item.coo ?? '',
          skuError: null
        }))
      : [emptyLine()]
  );

  const [productSuggestions, setProductSuggestions] = useState<Record<string, ProductOption[]>>({});
  const [variantPool, setVariantPool] = useState<Record<string, VariantOption[]>>({});
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorsFetched, setVendorsFetched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const immutableBySku = useMemo(() => new Set(lines.filter((line) => line.sku.trim()).map((line) => line.rowId)), [lines]);
  const allVendorOptions = useMemo(() => {
    if (vendor && !vendorOptions.includes(vendor)) {
      return [vendor, ...vendorOptions];
    }
    return vendorOptions;
  }, [vendor, vendorOptions]);

  useEffect(() => {
    if (loadingVendors || bootstrap.loading || bootstrap.error || vendorOptions.length > 0 || vendorsFetched) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        setLoadingVendors(true);
        const response = await apiFetch<{ vendors: string[] }>('/api/shopify/vendors');
        if (mounted) {
          setVendorOptions(response.vendors);
        }
      } catch {
        if (mounted) {
          setVendorOptions([]);
        }
      } finally {
        if (mounted) {
          setLoadingVendors(false);
          setVendorsFetched(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bootstrap.error, bootstrap.loading, loadingVendors, vendorOptions.length, vendorsFetched]);

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
      const payload = await apiFetch<{
        matches: Array<{
          variantId: string;
          sku: string;
          productId: string;
          productTitle: string;
          variantTitle: string;
        }>;
        count: number;
      }>(`/api/shopify/variants/validate-sku?sku=${encodeURIComponent(sku)}`);

      if (payload.count === 0) {
        updateLine(rowId, (line) => ({ ...line, skuError: 'SKU not found in Shopify variants' }));
        return;
      }

      if (payload.count > 1) {
        updateLine(rowId, (line) => ({ ...line, skuError: 'SKU matched multiple variants' }));
        return;
      }

      const [match] = payload.matches;
      if (!match) {
        updateLine(rowId, (line) => ({ ...line, skuError: 'SKU validation returned no match' }));
        return;
      }

      updateLine(rowId, (line) => ({
        ...line,
        sku: match.sku,
        productId: match.productId,
        productTitle: match.productTitle,
        variantId: match.variantId,
        variantTitle: match.variantTitle,
        skuError: null
      }));

      setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      setVariantPool((prev) => ({ ...prev, [rowId]: [] }));
    } catch (error) {
      updateLine(rowId, (line) => ({
        ...line,
        skuError: error instanceof Error ? error.message : 'Unable to validate SKU'
      }));
    }
  }

  async function searchProducts(rowId: string, query: string) {
    if (query.trim().length < 2) {
      setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
      return;
    }

    try {
      const payload = await apiFetch<{ products: ProductOption[] }>(
        `/api/shopify/products/search?q=${encodeURIComponent(query)}`
      );
      setProductSuggestions((prev) => ({ ...prev, [rowId]: payload.products }));
    } catch {
      setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));
    }
  }

  async function selectProduct(rowId: string, product: ProductOption) {
    updateLine(rowId, (line) => ({
      ...line,
      productId: product.id,
      productTitle: product.title,
      variantId: null,
      variantTitle: ''
    }));

    setProductSuggestions((prev) => ({ ...prev, [rowId]: [] }));

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
      sku: line.sku || variant.sku || '',
      skuError: null
    }));
  }

  function validateBeforeSubmit(): boolean {
    setSubmitError(null);
    setHeaderError(null);

    if (!vendor.trim()) {
      setHeaderError('Vendor is required');
      return false;
    }

    if (lines.length === 0) {
      setSubmitError('At least one line item is required');
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

      if (line.coo.trim() && line.coo.trim().length !== 2) {
        setSubmitError(`Line ${index + 1}: COO must be 2 characters`);
        return false;
      }
    }

    if (shippingFees.trim()) {
      const money = Number(shippingFees);
      if (!Number.isFinite(money) || money < 0) {
        setHeaderError('Shipping fees must be >= 0');
        return false;
      }
    }

    return true;
  }

  async function submit() {
    if (readOnly || submitting || bootstrap.loading || !bootstrap.csrfToken) {
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
      if (mode === 'create') {
        const created = await apiFetch<{ poNumber: string }>('/api/purchase-orders', {
          method: 'POST',
          csrfToken: bootstrap.csrfToken,
          body: JSON.stringify(payload)
        });

        setSuccessMessage(`Purchase order #${created.poNumber} created successfully.`);
        router.push('/purchase-orders');
        router.refresh();
      } else {
        const poNumber = initialData?.poNumber;
        if (!poNumber) {
          throw new Error('Missing purchase order number');
        }

        await apiFetch<{ purchaseOrder: PurchaseOrderDto }>(`/api/purchase-orders/${poNumber}`, {
          method: 'PATCH',
          csrfToken: bootstrap.csrfToken,
          body: JSON.stringify(payload)
        });

        setSuccessMessage(`Purchase order #${poNumber} updated successfully.`);
        router.refresh();
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (bootstrap.loading) {
    return <div className="panel">Initializing embedded Shopify session...</div>;
  }

  if (bootstrap.error) {
    return <div className="panel error-text">{bootstrap.error}</div>;
  }

  return (
    <div className="page-shell layout-col">
      <s-page>
        <s-section>
          <div className="panel layout-col">
            <h1>{title}</h1>
            {readOnly ? (
              <div className="readonly-banner">
                This purchase order is archived and cannot be modified. Fields are shown in read-only mode.
              </div>
            ) : null}
            {headerError ? <div className="error-text">{headerError}</div> : null}
            {submitError ? <div className="error-text">{submitError}</div> : null}
            {successMessage ? <div className="info-text">{successMessage}</div> : null}

            <div className="layout-row">
              <div className="col-4">
                <label htmlFor="vendor">Vendor</label>
                <select
                  id="vendor"
                  value={vendor}
                  disabled={readOnly}
                  onChange={(event) => setVendor(event.target.value)}
                >
                  <option value="">Select vendor</option>
                  {allVendorOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-4">
                <label htmlFor="import-duties">Import Duties</label>
                <select
                  id="import-duties"
                  value={importDuties ? 'true' : 'false'}
                  disabled={readOnly}
                  onChange={(event) => setImportDuties(event.target.value === 'true')}
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </div>

              <div className="col-4">
                <label htmlFor="import-type">Import Type</label>
                <select
                  id="import-type"
                  value={importType}
                  disabled={readOnly}
                  onChange={(event) => setImportType(event.target.value)}
                >
                  {IMPORT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-3">
                <label htmlFor="expected-on">Expected On</label>
                <input
                  id="expected-on"
                  className="field"
                  type="date"
                  value={expectedDate}
                  disabled={readOnly}
                  onChange={(event) => setExpectedDate(event.target.value)}
                />
              </div>

              <div className="col-3">
                <label htmlFor="shipping-fees">Shipping Fees</label>
                <input
                  id="shipping-fees"
                  className="field"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingFees}
                  disabled={readOnly}
                  onChange={(event) => setShippingFees(event.target.value)}
                />
              </div>

              <div className="col-3">
                <label htmlFor="shipping-fees-currency">Shipping Fees Currency</label>
                <select
                  id="shipping-fees-currency"
                  value={shippingFeesCurrency}
                  disabled={readOnly}
                  onChange={(event) => setShippingFeesCurrency(event.target.value)}
                >
                  {CURRENCIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-12">
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={notes}
                  disabled={readOnly}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
            </div>
          </div>
        </s-section>

        <s-section>
          <div className="panel layout-col">
            <div className="inline">
              <h2 style={{ margin: 0 }}>Items Grid</h2>
              {!readOnly ? (
                <button className="btn-neutral" type="button" onClick={addLine}>
                  Add line
                </button>
              ) : null}
            </div>

            <div className="table-scroll">
              <s-table>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>SKU</th>
                      <th>Product Title</th>
                      <th>Variant Title</th>
                      <th>Order Qty</th>
                      <th>Unit Cost</th>
                      <th>Unit Cost Currency</th>
                      <th>HS Code</th>
                      <th>COO</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                    const lockBySku = immutableBySku.has(line.rowId);
                    const variants = variantPool[line.rowId] ?? [];
                    const variantSuggestions = variants.filter((variant) =>
                      variant.variantTitle.toLowerCase().includes(line.variantTitle.toLowerCase())
                    );

                    return (
                      <tr key={line.rowId}>
                        <td>{index + 1}</td>
                        <td>
                          <input
                            className="field"
                            value={line.sku}
                            disabled={readOnly}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateLine(line.rowId, (current) => ({
                                ...current,
                                sku: value,
                                skuError: null,
                                ...(value ? {} : { productId: null, variantId: null })
                              }));
                            }}
                            onBlur={() => {
                              if (line.sku.trim()) {
                                void validateSkuForLine(line.rowId);
                              }
                            }}
                          />
                          {line.skuError ? <div className="error-text">{line.skuError}</div> : null}
                        </td>

                        <td>
                          <div className="autocomplete">
                            <input
                              className="field"
                              value={line.productTitle}
                              disabled={readOnly || lockBySku}
                              onChange={(event) => {
                                const value = event.target.value;
                                updateLine(line.rowId, (current) => ({
                                  ...current,
                                  productTitle: value,
                                  productId: null,
                                  variantId: null,
                                  variantTitle: ''
                                }));
                                void searchProducts(line.rowId, value);
                              }}
                            />
                            {!readOnly && !lockBySku && (productSuggestions[line.rowId]?.length ?? 0) > 0 ? (
                              <div className="autocomplete-panel">
                                {productSuggestions[line.rowId]!.map((product) => (
                                  <button
                                    key={product.id}
                                    type="button"
                                    className="autocomplete-item"
                                    onClick={() => {
                                      void selectProduct(line.rowId, product);
                                    }}
                                  >
                                    {product.title} ({product.vendor})
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <div className="autocomplete">
                            <input
                              className="field"
                              value={line.variantTitle}
                              disabled={readOnly || lockBySku}
                              onChange={(event) => {
                                updateLine(line.rowId, (current) => ({
                                  ...current,
                                  variantTitle: event.target.value,
                                  variantId: null
                                }));
                              }}
                            />
                            {!readOnly && !lockBySku && variantSuggestions.length > 0 ? (
                              <div className="autocomplete-panel">
                                {variantSuggestions.slice(0, 20).map((variant) => (
                                  <button
                                    key={variant.id}
                                    type="button"
                                    className="autocomplete-item"
                                    onClick={() => selectVariant(line.rowId, variant)}
                                  >
                                    {variant.variantTitle}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td>
                          <input
                            className="field"
                            type="number"
                            min="1"
                            step="1"
                            value={line.orderQty}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateLine(line.rowId, (current) => ({ ...current, orderQty: event.target.value }))
                            }
                          />
                        </td>

                        <td>
                          <input
                            className="field"
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unitCost}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateLine(line.rowId, (current) => ({ ...current, unitCost: event.target.value }))
                            }
                          />
                        </td>

                        <td>
                          <select
                            value={line.unitCostCurrency}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateLine(line.rowId, (current) => ({ ...current, unitCostCurrency: event.target.value }))
                            }
                          >
                            {CURRENCIES.map((currency) => (
                              <option key={currency} value={currency}>
                                {currency}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            className="field"
                            value={line.hsCode}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateLine(line.rowId, (current) => ({ ...current, hsCode: event.target.value }))
                            }
                          />
                        </td>

                        <td>
                          <input
                            className="field"
                            value={line.coo}
                            maxLength={2}
                            disabled={readOnly}
                            onChange={(event) =>
                              updateLine(line.rowId, (current) => ({
                                ...current,
                                coo: event.target.value.toUpperCase()
                              }))
                            }
                          />
                        </td>

                        <td>
                          {!readOnly ? (
                            <button className="btn-danger" type="button" onClick={() => removeLine(line.rowId)}>
                              Remove
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
              </s-table>
            </div>

            {!readOnly ? (
              <div className="action-row">
                <button type="button" className="btn-primary" onClick={() => void submit()} disabled={submitting}>
                  {submitting ? 'Saving...' : mode === 'create' ? 'Create Purchase Order' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="btn-neutral"
                  onClick={() => {
                    router.push('/purchase-orders');
                  }}
                >
                  Back to list
                </button>
              </div>
            ) : (
              <div className="action-row">
                <button
                  type="button"
                  className="btn-neutral"
                  onClick={() => {
                    router.push('/purchase-orders');
                  }}
                >
                  Back to list
                </button>
              </div>
            )}
          </div>
        </s-section>
      </s-page>
    </div>
  );
}
