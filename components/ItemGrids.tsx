'use client';

import { Dispatch, SetStateAction } from 'react';
import { CURRENCIES } from '@/lib/constants';
import type { FormLine, ProductOption, VariantOption } from '@/components/purchase-order-form';

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

  return '';
}

function eventValues(event: unknown): string[] {
  const currentValues = (event as { currentTarget?: { values?: unknown } }).currentTarget?.values;
  if (Array.isArray(currentValues)) {
    return currentValues.filter((value): value is string => typeof value === "string");
  }

  const targetValues = (event as { target?: { values?: unknown } }).target?.values;
  if (Array.isArray(targetValues)) {
    return targetValues.filter((value): value is string => typeof value === "string");
  }

  return [];
}

interface ItemGridsProps {
  readOnly: boolean;
  lines: FormLine[];
  immutableBySku: Set<string>;
  variantPool: Record<string, VariantOption[]>;
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
  setActiveProductPopoverRowId: Dispatch<SetStateAction<string | null>>;
  setActiveVariantPopoverRowId: Dispatch<SetStateAction<string | null>>;
}

export function ItemGrids({
  readOnly,
  lines,
  immutableBySku,
  variantPool,
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
  setActiveProductPopoverRowId,
  setActiveVariantPopoverRowId
}: ItemGridsProps) {
  return (
    <s-section>
      <s-stack direction="block" gap="base">
        <s-stack direction="inline" alignItems="center" justifyContent="space-between">
          <s-heading>Items Grid</s-heading>
          {!readOnly ? (
            <s-button type="button" onClick={addLine} variant="secondary">
              Add line
            </s-button>
          ) : null}
        </s-stack>

        <div style={{ overflowX: "auto" }}>
          <s-table variant="table">
            <s-table-header-row>
              <s-table-header>Item</s-table-header>
              <s-table-header>SKU</s-table-header>
              <s-table-header className="title-col-header">Product Title</s-table-header>
              <s-table-header className="title-col-header">Variant Title</s-table-header>
              <s-table-header format="numeric">Order Qty</s-table-header>
              <s-table-header format="numeric">Unit Cost</s-table-header>
              <s-table-header className="currency-col-header">Unit Cost Currency</s-table-header>
              <s-table-header className="hs-code-header">HS Code</s-table-header>
              <s-table-header>COO</s-table-header>
              <s-table-header>Actions</s-table-header>
            </s-table-header-row>
            <s-table-body>
              {lines.map((line, index) => {
                const lockBySku = immutableBySku.has(line.rowId);
                const variants = variantPool[line.rowId] ?? [];
                const currentProductSuggestions = productSuggestions[line.rowId] ?? [];
                const variantSuggestions = variants.filter((variant) =>
                  variant.variantTitle.toLowerCase().includes(line.variantTitle.toLowerCase())
                );

                const productPopoverId = `product-popover-${line.rowId}`;
                const variantPopoverId = `variant-popover-${line.rowId}`;

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
                              hsCode: value === current.sku ? current.hsCode : '',
                              ...(value ? {} : { productId: null, variantId: null, hsCode: '' })
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
                            className={readOnly || lockBySku ? "title-field-disabled" : undefined}
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
                            onBlur={() => {
                              window.setTimeout(() => {
                                setActiveProductPopoverRowId((prev) => (prev === line.rowId ? null : prev));
                              }, 120);
                            }}
                          />
                        </s-box>

                        {!readOnly && !lockBySku ? (
                          <>
                            <s-button
                              className="title-suggest-btn"
                              type="button"
                              variant="tertiary"
                              icon="search"
                              commandFor={productPopoverId}
                              disabled={currentProductSuggestions.length === 0}
                              onClick={() => {
                                if (currentProductSuggestions.length > 0) {
                                  setActiveProductPopoverRowId(line.rowId);
                                }
                              }}
                            >
                              Product suggestions
                            </s-button>

                            {activeProductPopoverRowId === line.rowId && currentProductSuggestions.length > 0 ? (
                              <s-popover id={productPopoverId} maxBlockSize="240px" inlineSize="360px">
                                <s-box padding="base">
                                  <s-stack direction="block" gap="small">
                                    <s-heading>Select product</s-heading>
                                    <s-choice-list
                                      values={line.productId ? [line.productId] : []}
                                      onChange={(event: Event) => {
                                        const [selectedId] = eventValues(event);
                                        if (!selectedId) {
                                          return;
                                        }
                                        const selected = currentProductSuggestions.find((product) => product.id === selectedId);
                                        if (selected) {
                                          selectProduct(line.rowId, selected);
                                        }
                                      }}
                                      onInput={(event: Event) => {
                                        const [selectedId] = eventValues(event);
                                        if (!selectedId) {
                                          return;
                                        }
                                        const selected = currentProductSuggestions.find((product) => product.id === selectedId);
                                        if (selected) {
                                          selectProduct(line.rowId, selected);
                                        }
                                      }}
                                    >
                                      {currentProductSuggestions.slice(0, 20).map((product) => (
                                        <s-choice key={product.id} value={product.id}>
                                          {`${product.title} (${product.vendor})`}
                                        </s-choice>
                                      ))}
                                    </s-choice-list>
                                  </s-stack>
                                </s-box>
                              </s-popover>
                            ) : null}
                          </>
                        ) : null}
                      </s-stack>
                    </s-table-cell>

                    <s-table-cell className="title-col-cell">
                      <s-stack direction="block" gap="small">
                        <s-box className="title-control-wrap">
                          <s-text-field
                            className={readOnly || lockBySku ? 'title-field-disabled' : undefined}
                            value={line.variantTitle}
                            disabled={readOnly || lockBySku}
                            onInput={(event: Event) => {
                              const value = eventValue(event);
                              updateLine(line.rowId, (current) => ({
                                ...current,
                                variantTitle: value,
                                variantId: null
                              }));
                              setActiveVariantPopoverRowId(value.trim() ? line.rowId : null);
                            }}
                            onBlur={() => {
                              window.setTimeout(() => {
                                setActiveVariantPopoverRowId((prev) => (prev === line.rowId ? null : prev));
                              }, 120);
                            }}
                          />
                        </s-box>

                        {!readOnly && !lockBySku ? (
                          <>
                            <s-button
                              className="title-suggest-btn"
                              type="button"
                              variant="tertiary"
                              icon="search"
                              commandFor={variantPopoverId}
                              disabled={variantSuggestions.length === 0}
                              onClick={() => {
                                if (variantSuggestions.length > 0) {
                                  setActiveVariantPopoverRowId(line.rowId);
                                }
                              }}
                            >
                              Variant suggestions
                            </s-button>

                            {activeVariantPopoverRowId === line.rowId && variantSuggestions.length > 0 ? (
                              <s-popover id={variantPopoverId} maxBlockSize="240px" inlineSize="360px">
                                <s-box padding="base">
                                  <s-stack direction="block" gap="small">
                                    <s-heading>Select variant</s-heading>
                                    <s-choice-list
                                      values={line.variantId ? [line.variantId] : []}
                                      onChange={(event: Event) => {
                                        const [selectedId] = eventValues(event);
                                        if (!selectedId) {
                                          return;
                                        }
                                        const selected = variantSuggestions.find((variant) => variant.id === selectedId);
                                        if (selected) {
                                          selectVariant(line.rowId, selected);
                                        }
                                      }}
                                      onInput={(event: Event) => {
                                        const [selectedId] = eventValues(event);
                                        if (!selectedId) {
                                          return;
                                        }
                                        const selected = variantSuggestions.find((variant) => variant.id === selectedId);
                                        if (selected) {
                                          selectVariant(line.rowId, selected);
                                        }
                                      }}
                                    >
                                      {variantSuggestions.slice(0, 20).map((variant) => (
                                        <s-choice key={variant.id} value={variant.id}>
                                          {variant.variantTitle}
                                        </s-choice>
                                      ))}
                                    </s-choice-list>
                                  </s-stack>
                                </s-box>
                              </s-popover>
                            ) : null}
                          </>
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
                        {CURRENCIES.map((currency) => (
                          <s-option key={currency} value={currency}>
                            {currency}
                          </s-option>
                        ))}
                      </s-select>
                    </s-table-cell>

                    <s-table-cell className="hs-code-cell">
                      <s-text-field
                        className="hs-code-field title-field-disabled"
                        value={line.hsCode}
                        disabled
                      />
                    </s-table-cell>

                    <s-table-cell>
                      <s-text-field
                        value={line.coo}
                        maxLength={2}
                        disabled={readOnly}
                        onInput={(event: Event) =>
                          updateLine(line.rowId, (current) => ({
                            ...current,
                            coo: eventValue(event).toUpperCase()
                          }))
                        }
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
        </div>
      </s-stack>
    </s-section>
  );
}
