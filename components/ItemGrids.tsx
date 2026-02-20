"use client";

import { Dispatch, SetStateAction } from 'react';
import { COO_CODES, COO_LABELS } from '@/lib/constants';
import type { FormLine, ProductOption, VariantOption } from '@/components/po-form.types';
import { eventValue, eventValues } from '@/components/po-form.utils';
import { CurrencyOptions } from '@/components/currency-options';

interface ItemGridsProps {
  readOnly: boolean;
  lines: FormLine[];
  immutableBySku: Set<string>;
  variantSuggestions: Record<string, VariantOption[]>;
  productSuggestions: Record<string, ProductOption[]>;
  activeProductPopoverRowId: string | null;
  activeVariantPopoverRowId: string | null;
  addLine: () => void;
  removeLine: (rowId: string) => void;
  updateLine: (rowId: string, updater: (line: FormLine) => FormLine) => void;
  validateSkuForLine: (rowId: string) => Promise<void>;
  searchProducts: (rowId: string, query: string) => Promise<void>;
  selectProduct: (rowId: string, product: ProductOption) => Promise<void>;
  selectVariant: (rowId: string, variant: VariantOption) => void;
  searchVariants: (rowId: string, query: string) => Promise<void>;
  variantSearchResults: Record<string, VariantOption[]>;
  setActiveProductPopoverRowId: Dispatch<SetStateAction<string | null>>;
  setActiveVariantPopoverRowId: Dispatch<SetStateAction<string | null>>;
  activeCooPopoverRowId: string | null;
  setActiveCooPopoverRowId: Dispatch<SetStateAction<string | null>>;
}

export function ItemGrids({
  readOnly,
  lines,
  immutableBySku,
  variantSuggestions,
  productSuggestions,
  activeProductPopoverRowId,
  activeVariantPopoverRowId,
  addLine,
  removeLine,
  updateLine,
  validateSkuForLine,
  searchProducts,
  selectProduct,
  selectVariant,
  searchVariants,
  variantSearchResults,
  setActiveProductPopoverRowId,
  setActiveVariantPopoverRowId,
  activeCooPopoverRowId,
  setActiveCooPopoverRowId
}: ItemGridsProps) {

  const handleCooInput = (rowId: string, event: Event) => {
    const [selectedCode] = eventValues(event);
    if (!selectedCode) return;
    updateLine(rowId, (current) => ({ ...current, coo: selectedCode.toUpperCase() }));
    setActiveCooPopoverRowId(null);
  };

  // const uploadCSV = () => {

  // }
  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" alignItems="center" justifyContent="space-between">
          <s-heading>Items Grid</s-heading>
          {!readOnly ? (
            <s-stack direction="inline" gap="small">
              <s-button type="button" onClick={addLine} variant="primary">
                Add line
              </s-button>
              {/* <s-button type="file" variant="secondary" onClick={uploadCSV}>
                Upload CSV
              </s-button> */}
            </s-stack>
          ) : null}
        </s-stack>

        <s-table variant="table">
          <s-table-header-row>
            <s-table-header className="title-col-header"><span className="table-header-label">Item</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">SKU</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">Product Title</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">Variant Title</span></s-table-header>
            <s-table-header className="title-col-header" format="numeric"><span className="table-header-label">Order Qty</span></s-table-header>
            <s-table-header className="title-col-header" format="numeric"><span className="table-header-label">Unit Cost</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">Unit Cost Currency</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">HS Code</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">COO</span></s-table-header>
            <s-table-header className="title-col-header"><span className="table-header-label">Actions</span></s-table-header>
          </s-table-header-row>
          <s-table-body>
            {lines.map((line, index) => {
              const lockBySku = immutableBySku.has(line.rowId);
              const variants = variantSuggestions[line.rowId] ?? [];
              const currentProductSuggestions = productSuggestions[line.rowId] ?? [];
              const variantPoolVariants = variants.filter((variant) =>
                variant.variantTitle.toUpperCase().includes(line.variantTitle.toUpperCase())
              );
              const filteredVariantSuggestions = line.productId
                ? variantPoolVariants
                : (variantSearchResults[line.rowId] ?? []);

              const cooQuery = line.coo.trim().toUpperCase();
              const hasExactCooMatch =
                cooQuery.length === 2 && COO_CODES.includes(cooQuery);

              const cooError =
                cooQuery.length === 0
                  ? null
                  : cooQuery.length > 2
                    ? "COO must be exactly 2 characters"
                    : cooQuery.length === 2 && !COO_CODES.includes(cooQuery)
                      ? `${cooQuery} is not a valid country code`
                      : null;
              const cooSuggestions = COO_CODES.filter((code) => {
                const cooLabel = (COO_LABELS[code] ?? "").toUpperCase();
                return !cooQuery || code.includes(cooQuery) || cooLabel.includes(cooQuery);
              });


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
                            coo: value === current.sku ? current.coo : "",
                            cooLocked: value === current.sku ? current.cooLocked : false,
                            hsCode: value === current.sku ? current.hsCode : "",
                            ...(value ? {} : { productId: null, variantId: null, hsCode: "", coo: "", cooLocked: false })
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

                  <s-table-cell className="currency-col-cell">
                    <s-select
                      className="currency-field"
                      value={line.unitCostCurrency}
                      disabled={readOnly}
                      onChange={(event: Event) =>
                        updateLine(line.rowId, (current) => ({
                          ...current,
                          unitCostCurrency: eventValue(event)
                        }))
                      }
                    >
                      <CurrencyOptions />
                    </s-select>
                  </s-table-cell>

                  <s-table-cell>
                    <s-text-field
                      className="hs-code-field title-field-disabled"
                      value={line.hsCode}
                      disabled
                      maxLength={7}
                    />
                  </s-table-cell>

                  <s-table-cell>
                    {line.cooLocked ? (
                      <s-text-field
                        className="coo-field title-field-disabled"
                        value={line.coo}
                        disabled
                      />
                    ) : (
                      <s-stack direction="block" gap="small">
                        <s-text-field
                          className="coo-field"
                          value={line.coo}
                          disabled={readOnly}
                          onInput={(event: Event) => {
                            const value = eventValue(event).toUpperCase();
                            updateLine(line.rowId, (current) => ({
                              ...current,
                              coo: value
                            }));
                            const cooTrimmed = value.trim();
                            const isExact =
                              cooTrimmed.length === 2 &&
                              COO_CODES.includes(cooTrimmed);
                            setActiveCooPopoverRowId(isExact ? null : line.rowId);
                          }}
                          onFocus={() => {
                            setActiveCooPopoverRowId(hasExactCooMatch ? null : line.rowId);
                          }}
                          onBlur={() => {
                            window.setTimeout(() => {
                              setActiveCooPopoverRowId((prev) => (prev === line.rowId ? null : prev));
                            }, 120);
                          }}
                        />
                        {!readOnly &&
                          activeCooPopoverRowId === line.rowId &&
                          cooSuggestions.length > 0 &&
                          !hasExactCooMatch ? (
                          <div style={{ border: '1px solid #d8dce1', borderRadius: "10px", maxHeight: "150px", overflow: "auto", padding: "0.5rem" }}>
                            <s-choice-list
                              values={line.coo ? [line.coo] : []}
                              onChange={(event: Event) => handleCooInput(line.rowId, event)}
                              onInput={(event: Event) => handleCooInput(line.rowId, event)}
                            >
                              {cooSuggestions.map((code) => (
                                <s-choice
                                  key={code}
                                  value={code}
                                >
                                  {`${code} - ${COO_LABELS[code] ?? code}`}
                                </s-choice>
                              ))}
                            </s-choice-list>
                          </div>
                        ) : null}
                        {cooError ? <s-text color="critical">{cooError}</s-text> : null}
                      </s-stack>
                    )}
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
  );
}
