"use client";

import { Dispatch, SetStateAction, useState, useRef } from 'react';
import type { FormLine, ProductOption, VariantOption } from '@/components/po-form.types';
import { eventValue } from '@/components/po-form.utils';
import { ParseCsvData, parseCsvHeaders } from '@/lib/po/item-import/parseCsvPurchaseOrderItems';
import { parseExcelHeaders } from '@/lib/po/item-import/parseExcelFile';
import { ExcelImportDialog } from './ExcelImportDialog';

export interface ItemGridsData {
  lines: FormLine[];
  immutableBySku: Set<string>;
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
  importItemsFromFile: (file: File) => Promise<void>;
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

          <s-table variant="table">
            <s-table-header-row>
              <s-table-header className="title-col-header"><span className="table-header-label">Item</span></s-table-header>
              <s-table-header className="title-col-header"><span className="table-header-label">SKU</span></s-table-header>
              <s-table-header className="title-col-header"><span className="table-header-label">Product Handle</span></s-table-header>
              <s-table-header className="title-col-header"><span className="table-header-label">Variant</span></s-table-header>
              <s-table-header className="title-col-header" format="numeric"><span className="table-header-label">Order Qty</span></s-table-header>
              <s-table-header className="title-col-header" format="numeric"><span className="table-header-label">Unit Cost</span></s-table-header>
              <s-table-header className="title-col-header" format="numeric"><span className="table-header-label">PO Currency</span></s-table-header>
              <s-table-header className="title-col-header"><span className="table-header-label">Actions</span></s-table-header>
            </s-table-header-row>
            <s-table-body>
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
                  <s-table-row key={line.rowId}>
                    <s-table-cell>
                      <s-text>{index + 1}</s-text>
                    </s-table-cell>

                    <s-table-cell>
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
                          onBlur={() => {
                            if (line.sku.trim()) {
                              void validateSkuForLine(line.rowId);
                            }
                          }}
                        />
                        {line.skuError ? <s-text color="critical">{line.skuError}</s-text> : null}
                      </s-stack>
                    </s-table-cell>

                    <s-table-cell className="title-col-cell">
                      <s-stack direction="block" gap="small">
                        <s-box className="title-control-wrap">
                          <s-text-field
                            className={readOnly || lockBySku ? "product-title-field title-field-disabled" : "product-title-field"}
                            value={line.productTitle}
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
                    </s-table-cell>

                    <s-table-cell className="title-col-cell">
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
                    </s-table-cell>

                    <s-table-cell>
                      <s-number-field
                        value={line.orderQty}
                        min="1"
                        step="1"
                        disabled={readOnly}
                        onInput={(event: Event) =>
                          updateLine(line.rowId, (current) => ({ ...current, orderQty: eventValue(event) }))
                        }
                      />
                    </s-table-cell>

                    <s-table-cell>
                      <s-number-field
                        value={line.unitCost}
                        min="0"
                        step="0.01"
                        disabled={readOnly}
                        onInput={(event: Event) =>
                          updateLine(line.rowId, (current) => ({ ...current, unitCost: eventValue(event) }))
                        }
                      />
                    </s-table-cell>

                    <s-table-cell>
                      <s-text-field
                        value={purchaseOrderCurrency}
                        disabled={true}
                      />
                    </s-table-cell>

                    <s-table-cell>
                      {!readOnly ? (
                        <s-button type="button" variant="secondary" tone="critical" onClick={() => removeLine(line.rowId)}>
                          Remove
                        </s-button>
                      ) : null}
                    </s-table-cell>
                  </s-table-row>
                );
              })}
            </s-table-body>
          </s-table>
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
          onClose={() => setImportData(null)}
        />
      )}
    </>
  );
}