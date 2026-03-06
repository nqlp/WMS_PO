"use client";

import { Dispatch, SetStateAction, useState, useRef } from 'react';
import type { FormLine, ProductOption, VariantOption } from '@/components/po-form.types';
import { eventValue } from '@/components/po-form.utils';
import { ParseCsvData, parseCsvHeaders } from '@/lib/po/item-import/parseCsvPurchaseOrderItems';
import { parseExcelHeaders } from '@/lib/po/item-import/parseExcelFile';
import { ExcelImportDialog } from './ExcelImportDialog';
import './ItemGrids.css';

export interface ItemGridsData {
  lines: FormLine[];
  immutableBySku: Set<string>;
  validatingSkuRows: Set<string>;
  variantSuggestions: Record<string, VariantOption[]>;
  productSuggestions: Record<string, ProductOption[]>;
  variantSearchResults: Record<string, VariantOption[]>;
  purchaseOrderCurrency: string;
}

export interface ItemGridsPopovers {
  activeProductPopoverRowId: string | null;
  setActiveProductPopoverRowId: Dispatch<SetStateAction<string | null>>;
  activeVariantPopoverRowId: string | null;
  setActiveVariantPopoverRowId: Dispatch<SetStateAction<string | null>>;
}

export interface ItemGridsActions {
  addLine: () => void;
  removeLine: (rowId: string) => void;
  updateLine: (rowId: string, updater: (line: FormLine) => FormLine) => void;
  validateSkuForLine: (rowId: string) => Promise<void>;
  searchProducts: (rowId: string, query: string) => Promise<void>;
  selectProduct: (rowId: string, product: ProductOption) => Promise<void>;
  selectVariant: (rowId: string, variant: VariantOption) => void;
  searchVariants: (rowId: string, query: string) => Promise<void>;
  importLines: (lines: FormLine[]) => void;
}

interface ItemGridsProps {
  readOnly: boolean;
  data: ItemGridsData;
  popovers: ItemGridsPopovers;
  actions: ItemGridsActions;
}

export function ItemGrids({ readOnly, data, popovers, actions }: ItemGridsProps) {
  const {
    lines, immutableBySku, variantSuggestions, productSuggestions, variantSearchResults,
    purchaseOrderCurrency,
  } = data;
  const {
    activeProductPopoverRowId, setActiveProductPopoverRowId,
    activeVariantPopoverRowId, setActiveVariantPopoverRowId,
  } = popovers;
  const {
    addLine, removeLine, updateLine, validateSkuForLine,
    searchProducts, selectProduct, selectVariant, searchVariants,
  } = actions;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importData, setImportData] = useState<ParseCsvData | null>(null);

  return (
    <>
      <s-section>
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" alignItems="center" justifyContent="space-between">
            <s-heading>Items Grid</s-heading>
            {!readOnly ? (
              <s-stack direction="inline" gap="small">
                <s-button type="button" onClick={addLine} variant="primary">
                  Add line
                </s-button>
                <s-button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  Import File
                </s-button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  hidden
                  onChange={async (e) => {
                    const file = e.currentTarget.files?.[0];
                    if (!file) return;

                    let parsed;
                    if (file.name.endsWith(".csv")) {
                      const text = await file.text();
                      parsed = parseCsvHeaders(text);
                    } else {
                      parsed = await parseExcelHeaders(file);
                    }
                    setImportData(parsed);
                  }}

                />
              </s-stack>
            ) : null}
          </s-stack>

          <table className="item-grid-table">
            <thead>
              <tr>
                <th className="col-item"><span className="table-header-label">Item</span></th>
                <th className="col-sku"><span className="table-header-label">SKU</span></th>
                <th className="col-product"><span className="table-header-label">Product Handle</span></th>
                <th className="col-variant"><span className="table-header-label">Variant</span></th>
                <th className="col-qty"><span className="table-header-label">Order Qty</span></th>
                <th className="col-cost"><span className="table-header-label">Unit Cost</span></th>
                <th className="col-currency"><span className="table-header-label">PO Currency</span></th>
                <th className="col-actions"><span className="table-header-label">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const lockBySku = immutableBySku.has(line.rowId);
                const variants = variantSuggestions[line.rowId] ?? [];
                const currentProductSuggestions = productSuggestions[line.rowId] ?? [];
                const matchingProductVariants = variants.filter((variant) =>
                  variant.variantTitle.toUpperCase().includes(line.variantTitle.toUpperCase())
                );
                const filteredVariantSuggestions = line.productId
                  ? matchingProductVariants
                  : (variantSearchResults[line.rowId] ?? []);

                return (
                  <tr key={line.rowId}>
                    <td className="col-item">
                      <s-text>{index + 1}</s-text>
                    </td>

                    <td className="col-sku">
                      <s-stack direction="block" gap="small">
                        <s-text-field
                          value={line.sku}
                          disabled={readOnly}
                          onInput={(event: Event) => {
                            const value = eventValue(event);
                            updateLine(line.rowId, (current) => ({
                              ...current,
                              sku: value,
                              skuError: null,
                              variantId: value === current.sku ? current.variantId : null,
                              ...(value ? {} : { productId: null, variantId: null })
                            }));
                          }}
                          onKeyDown={(event: KeyboardEvent) => {
                            if (event.key === "Enter") {
                              event.preventDefault();

                              if (line.sku.trim()) {
                                void validateSkuForLine(line.rowId);
                              }
                            }
                          }}
                          onBlur={() => {
                            if (line.sku.trim()) {
                              void validateSkuForLine(line.rowId);
                            }
                          }}
                        />
                        {line.skuError ? <s-text color="critical">{line.skuError}</s-text> : null}
                      </s-stack>
                    </td>

                    <td className="col-product">
                      <s-stack direction="block" gap="small">
                        <s-box className="title-control-wrap">
                          <s-text-field
                            className={readOnly || lockBySku ? "product-title-field title-field-disabled" : "product-title-field"}
                            value={line.productTitle}
                            style={{ textAlign: "center" }}
                            disabled={readOnly || lockBySku}
                            onInput={(event: Event) => {
                              const value = eventValue(event);
                              updateLine(line.rowId, (current) => ({
                                ...current,
                                productTitle: value,
                                productId: null,
                                variantId: null,
                                variantTitle: ""
                              }));
                              void searchProducts(line.rowId, value);
                            }}
                            onFocus={() => {
                              if (currentProductSuggestions.length > 0) {
                                setActiveProductPopoverRowId(line.rowId);
                              }
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setActiveProductPopoverRowId((prev) => (prev === line.rowId ? null : prev));
                              }, 120);
                            }}
                          />
                        </s-box>

                        {!readOnly && !lockBySku && activeProductPopoverRowId === line.rowId && currentProductSuggestions.length > 0 ? (
                          <div style={{ border: "1px solid #d8dce1", borderRadius: "10px", maxHeight: "150px", overflow: "auto", padding: "0.5rem" }}>
                            <s-stack direction="block" gap="small">
                              {currentProductSuggestions.slice(0, 20).map((product) => (
                                <s-button
                                  key={product.id}
                                  className="title-suggest-btn"
                                  variant="plain"
                                  onClick={() => {
                                    void selectProduct(line.rowId, product);
                                  }}
                                >
                                  {`${product.title} (${product.vendor})`}
                                </s-button>
                              ))}
                            </s-stack>
                          </div>
                        ) : null}
                      </s-stack>
                    </td>

                    <td className="col-variant">
                      <s-stack direction="block" gap="small">
                        <s-box className="title-control-wrap">
                          <s-text-field
                            className={readOnly || lockBySku ? "variant-title-field title-field-disabled" : "variant-title-field"}
                            value={line.variantTitle}
                            disabled={readOnly || lockBySku}
                            onInput={(event: Event) => {
                              const value = eventValue(event);
                              updateLine(line.rowId, (current) => ({
                                ...current,
                                variantTitle: value,
                                variantId: null
                              }));
                              if (!line.productId && value.trim().length >= 1) {
                                void searchVariants(line.rowId, value);
                              }
                              setActiveVariantPopoverRowId(value.trim() ? line.rowId : null);
                            }}
                            onFocus={() => {
                              if (filteredVariantSuggestions.length > 0) {
                                setActiveVariantPopoverRowId(line.rowId);
                              }
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setActiveVariantPopoverRowId((prev) => (prev === line.rowId ? null : prev));
                              }, 120);
                            }}
                          />
                        </s-box>

                        {!readOnly && !lockBySku && activeVariantPopoverRowId === line.rowId && filteredVariantSuggestions.length > 0 ? (
                          <div style={{ border: "1px solid #d8dce1", borderRadius: "10px", maxHeight: "150px", overflow: "auto", padding: "0.5rem" }}>
                            <s-stack direction="block" gap="small">
                              {filteredVariantSuggestions.slice(0, 20).map((variant) => (
                                <s-button
                                  key={variant.id}
                                  className="title-suggest-btn"
                                  variant="plain"
                                  onClick={() => selectVariant(line.rowId, variant)}
                                >
                                  {variant.variantTitle}
                                </s-button>
                              ))}
                            </s-stack>
                          </div>
                        ) : null}
                      </s-stack>
                    </td>

                    <td className="col-qty">
                      <s-number-field
                        className="qty-field"
                        value={line.orderQty}
                        min="1"
                        step="1"
                        disabled={readOnly}
                        onInput={(event: Event) =>
                          updateLine(line.rowId, (current) => ({ ...current, orderQty: eventValue(event) }))
                        }
                      />
                    </td>

                    <td className="col-cost">
                      <s-number-field
                        className="cost-field"
                        value={line.unitCost}
                        min="0"
                        step="0.01"
                        disabled={readOnly}
                        onInput={(event: Event) =>
                          updateLine(line.rowId, (current) => ({ ...current, unitCost: eventValue(event) }))
                        }
                      />
                    </td>

                    <td className="col-currency">
                      <s-text-field
                        className="currency-display-field"
                        value={purchaseOrderCurrency}
                        disabled={true}
                      />
                    </td>

                    <td className="col-actions">
                      {!readOnly ? (
                        <s-button
                          type="button"
                          variant="secondary"
                          tone="critical"
                          onClick={() => removeLine(line.rowId)}
                        >
                          Remove
                        </s-button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </s-stack>
      </s-section>

      {importData && (
        <ExcelImportDialog
          headers={importData.headers}
          firstDataRow={importData.firstDataRow}
          allRows={importData.allRows}
          onImport={lines => {
            actions.importLines(lines);
            setImportData(null);
          }}
        />
      )}
    </>
  );
}