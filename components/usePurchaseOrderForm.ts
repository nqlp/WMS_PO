"use client";

import { type SetStateAction, useCallback, useEffect, useMemo, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { COO_CODES, DEFAULT_CURRENCY } from '@/lib/constants';
import { apiFetch } from '@/lib/client/api';
import { withEmbeddedParams } from '@/lib/client/embedded-url';
import { useEmbeddedBootstrap, useVendors } from '@/lib/client/hooks';
import { normalizeHsCode } from '@/lib/helper';
import { lineId, emptyLine, decimalText } from '@/components/po-form.utils';
import type {
    FormLine,
    ProductOption,
    PurchaseOrderDto,
    PurchaseOrderFormProps,
    VariantOption,
} from '@/components/po-form.types';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

interface FormState {
    // Header fields
    vendor: string;
    importDuties: boolean;
    importType: string;
    expectedDate: string;
    shippingFees: string;
    shippingFeesCurrency: string;
    notes: string;

    // Line items
    lines: FormLine[];

    // Autocomplete / search
    productSuggestions: Record<string, ProductOption[]>;
    variantSuggestions: Record<string, VariantOption[]>;
    variantSearchResults: Record<string, VariantOption[]>;

    // Popover visibility
    activeProductPopoverRowId: string | null;
    activeVariantPopoverRowId: string | null;
    activeCooPopoverRowId: string | null;

    // Validation & submission
    validatingSkuRows: Set<string>;
    headerError: string | null;
    submitError: string | null;
    successMessage: string | null;
    submitting: boolean;
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

type FormAction =
    // Header
    | { type: "SET_VENDOR"; value: string }
    | { type: "SET_IMPORT_DUTIES"; value: boolean }
    | { type: "SET_IMPORT_TYPE"; value: string }
    | { type: "SET_EXPECTED_DATE"; value: string }
    | { type: "SET_SHIPPING_FEES"; value: string }
    | { type: "SET_SHIPPING_FEES_CURRENCY"; value: string }
    | { type: "SET_NOTES"; value: string }
    // Lines
    | { type: "UPDATE_LINE"; rowId: string; updater: (line: FormLine) => FormLine }
    | { type: "ADD_LINE" }
    | { type: "REMOVE_LINE"; rowId: string }
    // Search / autocomplete
    | { type: "SET_PRODUCT_SUGGESTIONS"; rowId: string; products: ProductOption[] }
    | { type: "SET_VARIANT_SUGGESTIONS"; rowId: string; variants: VariantOption[] }
    | { type: "SET_VARIANT_SEARCH_RESULTS"; rowId: string; variants: VariantOption[] }
    // Popovers
    | { type: "SET_ACTIVE_PRODUCT_POPOVER"; rowId: string | null }
    | { type: "CLEAR_POPOVER_IF_MATCH"; rowId: string; target: "product" | "variant" | "coo" }
    | { type: "SET_ACTIVE_VARIANT_POPOVER"; rowId: string | null }
    | { type: "SET_ACTIVE_COO_POPOVER"; rowId: string | null }
    // SKU validation
    | { type: "SKU_VALIDATION_START"; rowId: string }
    | { type: "SKU_VALIDATION_END"; rowId: string }
    // Errors / status
    | { type: "SET_HEADER_ERROR"; error: string | null }
    | { type: "SET_SUBMIT_ERROR"; error: string | null }
    | { type: "SET_SUCCESS_MESSAGE"; message: string | null }
    | { type: "SET_SUBMITTING"; value: boolean }
    // Compound: clear row-specific state on remove
    | { type: "CLEAR_ROW_DATA"; rowId: string };

/* ------------------------------------------------------------------ */
/*  Reducer                                                            */
/* ------------------------------------------------------------------ */

function deleteKey<T>(record: Record<string, T>, key: string): Record<string, T> {
    const next = { ...record };
    delete next[key];
    return next;
}

function formReducer(state: FormState, action: FormAction): FormState {
    switch (action.type) {
        // Header
        case "SET_VENDOR":
            return { ...state, vendor: action.value };
        case "SET_IMPORT_DUTIES":
            return { ...state, importDuties: action.value };
        case "SET_IMPORT_TYPE":
            return { ...state, importType: action.value };
        case "SET_EXPECTED_DATE":
            return { ...state, expectedDate: action.value };
        case "SET_SHIPPING_FEES":
            return { ...state, shippingFees: action.value };
        case "SET_SHIPPING_FEES_CURRENCY":
            return { ...state, shippingFeesCurrency: action.value };
        case "SET_NOTES":
            return { ...state, notes: action.value };

        // Lines
        case "UPDATE_LINE":
            return {
                ...state,
                lines: state.lines.map((line) =>
                    line.rowId === action.rowId ? action.updater(line) : line
                ),
            };
        case "ADD_LINE":
            return { ...state, lines: [...state.lines, emptyLine()] };
        case "REMOVE_LINE": {
            if (state.lines.length <= 1) {
                return state;
            }
            return {
                ...state,
                lines: state.lines.filter((line) => line.rowId !== action.rowId),
            };
        }

        // Search / autocomplete
        case "SET_PRODUCT_SUGGESTIONS":
            return {
                ...state,
                productSuggestions: { ...state.productSuggestions, [action.rowId]: action.products },
            };
        case "SET_VARIANT_SUGGESTIONS":
            return {
                ...state,
                variantSuggestions: { ...state.variantSuggestions, [action.rowId]: action.variants },
            };
        case "SET_VARIANT_SEARCH_RESULTS":
            return {
                ...state,
                variantSearchResults: { ...state.variantSearchResults, [action.rowId]: action.variants },
            };

        // Popovers
        case "SET_ACTIVE_PRODUCT_POPOVER":
            return { ...state, activeProductPopoverRowId: action.rowId };
        case "SET_ACTIVE_VARIANT_POPOVER":
            return { ...state, activeVariantPopoverRowId: action.rowId };
        case "SET_ACTIVE_COO_POPOVER":
            return { ...state, activeCooPopoverRowId: action.rowId };
        case "CLEAR_POPOVER_IF_MATCH": {
            const updates: Partial<FormState> = {};
            if (action.target === "product" && state.activeProductPopoverRowId === action.rowId) {
                updates.activeProductPopoverRowId = null;
            }
            if (action.target === "variant" && state.activeVariantPopoverRowId === action.rowId) {
                updates.activeVariantPopoverRowId = null;
            }
            if (action.target === "coo" && state.activeCooPopoverRowId === action.rowId) {
                updates.activeCooPopoverRowId = null;
            }
            return { ...state, ...updates };
        }

        // SKU validation
        case "SKU_VALIDATION_START": {
            const next = new Set(state.validatingSkuRows);
            next.add(action.rowId);
            return { ...state, validatingSkuRows: next };
        }
        case "SKU_VALIDATION_END": {
            const next = new Set(state.validatingSkuRows);
            next.delete(action.rowId);
            return { ...state, validatingSkuRows: next };
        }

        // Errors / status
        case "SET_HEADER_ERROR":
            return { ...state, headerError: action.error };
        case "SET_SUBMIT_ERROR":
            return { ...state, submitError: action.error };
        case "SET_SUCCESS_MESSAGE":
            return { ...state, successMessage: action.message };
        case "SET_SUBMITTING":
            return { ...state, submitting: action.value };

        // Compound: clean up row data on remove
        case "CLEAR_ROW_DATA":
            return {
                ...state,
                productSuggestions: deleteKey(state.productSuggestions, action.rowId),
                variantSuggestions: deleteKey(state.variantSuggestions, action.rowId),
                variantSearchResults: deleteKey(state.variantSearchResults, action.rowId),
                activeProductPopoverRowId:
                    state.activeProductPopoverRowId === action.rowId ? null : state.activeProductPopoverRowId,
                activeVariantPopoverRowId:
                    state.activeVariantPopoverRowId === action.rowId ? null : state.activeVariantPopoverRowId,
                activeCooPopoverRowId:
                    state.activeCooPopoverRowId === action.rowId ? null : state.activeCooPopoverRowId,
            };

        default:
            return state;
    }
}

/* ------------------------------------------------------------------ */
/*  Initial state builder                                              */
/* ------------------------------------------------------------------ */

function buildInitialState(initialData?: PurchaseOrderDto): FormState {
    return {
        vendor: initialData?.vendor ?? "",
        importDuties: initialData?.importDuties ?? false,
        importType: initialData?.importType ?? "NO_IMPORT",
        expectedDate: initialData?.expectedDate?.slice(0, 10) ?? "",
        shippingFees: decimalText(initialData?.shippingFees ?? null),
        shippingFeesCurrency: initialData?.shippingFeesCurrency ?? DEFAULT_CURRENCY,
        notes: initialData?.notes ?? "",

        lines: initialData?.items?.length
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
                skuError: null,
            }))
            : [emptyLine()],

        productSuggestions: {},
        variantSuggestions: {},
        variantSearchResults: {},
        activeProductPopoverRowId: null,
        activeVariantPopoverRowId: null,
        activeCooPopoverRowId: null,
        validatingSkuRows: new Set(),
        headerError: null,
        submitError: null,
        successMessage: null,
        submitting: false,
    };
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function usePurchaseOrderForm({
    mode,
    initialData,
    readOnly = false,
}: Omit<PurchaseOrderFormProps, "title">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const purchaseOrdersHref = withEmbeddedParams("/purchase-orders", searchParams);
    const bootstrap = useEmbeddedBootstrap();

    const [state, dispatch] = useReducer(formReducer, initialData, buildInitialState);

    const { allVendorOptions, loading: loadingVendors } = useVendors(
        !bootstrap.loading && !bootstrap.error,
        state.vendor
    );

    /* Derived state */
    const immutableBySku = useMemo(
        () => new Set(state.lines.filter((line) => line.sku.trim()).map((line) => line.rowId)),
        [state.lines]
    );
    const isSkuValidationLoading = state.validatingSkuRows.size > 0;

    /* Side effect: loading cursor */
    useEffect(() => {
        document.body.classList.toggle("sku-loading-cursor", isSkuValidationLoading);
        return () => {
            document.body.classList.remove("sku-loading-cursor");
        };
    }, [isSkuValidationLoading]);

    /* ---- Line helpers ---- */

    const updateLine = useCallback(
        (rowId: string, updater: (line: FormLine) => FormLine) => {
            dispatch({ type: "UPDATE_LINE", rowId, updater });
        },
        []
    );

    const addLine = useCallback(() => {
        dispatch({ type: "ADD_LINE" });
    }, []);

    const removeLine = useCallback((rowId: string) => {
        dispatch({ type: "REMOVE_LINE", rowId });
        dispatch({ type: "CLEAR_ROW_DATA", rowId });
    }, []);

    /* ---- SKU validation ---- */

    const validateSkuForLine = useCallback(
        async (rowId: string) => {
            const row = state.lines.find((line) => line.rowId === rowId);
            if (!row) return;

            const sku = row.sku.trim();
            if (!sku) {
                dispatch({ type: "UPDATE_LINE", rowId, updater: (line) => ({ ...line, skuError: null }) });
                return;
            }

            try {
                dispatch({ type: "SKU_VALIDATION_START", rowId });
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
                    dispatch({
                        type: "UPDATE_LINE",
                        rowId,
                        updater: (line) => ({
                            ...line,
                            variantId: null,
                            hsCode: "",
                            coo: "",
                            cooLocked: false,
                            skuError: "SKU not found in Shopify variants",
                        }),
                    });
                    return;
                }

                if (payload.count > 1) {
                    dispatch({
                        type: "UPDATE_LINE",
                        rowId,
                        updater: (line) => ({
                            ...line,
                            variantId: null,
                            coo: "",
                            cooLocked: false,
                            hsCode: "",
                            skuError: "SKU matched multiple variants",
                        }),
                    });
                    return;
                }

                const [match] = payload.matches;
                if (!match) {
                    dispatch({
                        type: "UPDATE_LINE",
                        rowId,
                        updater: (line) => ({
                            ...line,
                            variantId: null,
                            coo: "",
                            cooLocked: false,
                            hsCode: "",
                            skuError: "SKU validation returned no match",
                        }),
                    });
                    return;
                }

                dispatch({
                    type: "UPDATE_LINE",
                    rowId,
                    updater: (line) => ({
                        ...line,
                        sku: match.sku,
                        productId: match.productId,
                        productTitle: match.productTitle,
                        variantId: match.variantId,
                        variantTitle: match.variantTitle,
                        coo: match.coo ?? "",
                        cooLocked: Boolean(match.coo),
                        hsCode: normalizeHsCode(match.hsCode) ?? "",
                        skuError: null,
                    }),
                });

                dispatch({ type: "SET_PRODUCT_SUGGESTIONS", rowId, products: [] });
                dispatch({ type: "SET_VARIANT_SUGGESTIONS", rowId, variants: [] });
                dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "product" });
                dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "variant" });
                dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "coo" });
            } catch (error) {
                console.error("Error validating SKU", error);
                dispatch({
                    type: "UPDATE_LINE",
                    rowId,
                    updater: (line) => ({
                        ...line,
                        skuError: error instanceof Error ? error.message : "Unable to validate SKU",
                    }),
                });
            } finally {
                dispatch({ type: "SKU_VALIDATION_END", rowId });
            }
        },
        [state.lines]
    );

    /* ---- Search ---- */

    const searchProducts = useCallback(async (rowId: string, query: string) => {
        if (query.trim().length < 2) {
            dispatch({ type: "SET_PRODUCT_SUGGESTIONS", rowId, products: [] });
            dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "product" });
            return;
        }

        try {
            const payload = await apiFetch<{ products: ProductOption[] }>(
                `/api/shopify/products/search?q=${encodeURIComponent(query)}`
            );
            dispatch({ type: "SET_PRODUCT_SUGGESTIONS", rowId, products: payload.products });
            dispatch({ type: "SET_ACTIVE_PRODUCT_POPOVER", rowId });
        } catch {
            dispatch({ type: "SET_PRODUCT_SUGGESTIONS", rowId, products: [] });
            dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "product" });
        }
    }, []);

    const searchVariants = useCallback(async (rowId: string, query: string) => {
        if (query.trim().length < 1) {
            dispatch({ type: "SET_VARIANT_SEARCH_RESULTS", rowId, variants: [] });
            dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "variant" });
            return;
        }

        try {
            const payload = await apiFetch<{ variants: VariantOption[] }>(
                `/api/shopify/variants/search?q=${encodeURIComponent(query)}`
            );
            dispatch({ type: "SET_VARIANT_SEARCH_RESULTS", rowId, variants: payload.variants });
            dispatch({ type: "SET_ACTIVE_VARIANT_POPOVER", rowId });
        } catch {
            dispatch({ type: "SET_VARIANT_SEARCH_RESULTS", rowId, variants: [] });
            dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "variant" });
        }
    }, []);

    /* ---- Select product / variant ---- */

    const selectProduct = useCallback(async (rowId: string, product: ProductOption) => {
        dispatch({
            type: "UPDATE_LINE",
            rowId,
            updater: (line) => ({
                ...line,
                productId: product.id,
                productTitle: product.title,
                variantId: null,
                variantTitle: "",
                coo: "",
                cooLocked: false,
                hsCode: "",
            }),
        });

        dispatch({ type: "SET_PRODUCT_SUGGESTIONS", rowId, products: [] });
        dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "product" });

        try {
            const payload = await apiFetch<{ variants: VariantOption[] }>(
                `/api/shopify/products/${encodeURIComponent(product.id)}/variants`
            );
            dispatch({ type: "SET_VARIANT_SUGGESTIONS", rowId, variants: payload.variants });
        } catch {
            dispatch({ type: "SET_VARIANT_SUGGESTIONS", rowId, variants: product.variants ?? [] });
        }
    }, []);

    const selectVariant = useCallback((rowId: string, variant: VariantOption) => {
        dispatch({
            type: "UPDATE_LINE",
            rowId,
            updater: (line) => ({
                ...line,
                variantId: variant.id,
                variantTitle: variant.variantTitle,
                sku: line.sku || variant.sku || "",
                coo: variant.coo ?? "",
                cooLocked: Boolean(variant.coo),
                hsCode: normalizeHsCode(variant.hsCode) ?? "",
                skuError: null,
                ...(variant.productId && !line.productId ? { productId: variant.productId } : {}),
                ...(variant.productTitle && !line.productTitle ? { productTitle: variant.productTitle } : {}),
            }),
        });
        dispatch({ type: "SET_VARIANT_SEARCH_RESULTS", rowId, variants: [] });
        dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "variant" });
    }, []);

    /* ---- Validation ---- */

    const validateBeforeSubmit = useCallback(async (): Promise<boolean> => {
        dispatch({ type: "SET_SUBMIT_ERROR", error: null });
        dispatch({ type: "SET_HEADER_ERROR", error: null });

        if (!state.vendor.trim()) {
            dispatch({ type: "SET_HEADER_ERROR", error: "Vendor is required" });
            return false;
        }

        if (state.lines.length === 0) {
            dispatch({ type: "SET_SUBMIT_ERROR", error: "At least one line item is required" });
            return false;
        }

        for (const [index, line] of state.lines.entries()) {
            if (line.skuError) {
                dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: ${line.skuError}` });
                return false;
            }

            if (!line.productTitle.trim()) {
                dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: Product title is required` });
                return false;
            }

            if (!line.variantTitle.trim()) {
                dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: Variant title is required` });
                return false;
            }

            const qty = Number.parseInt(line.orderQty, 10);
            if (!Number.isInteger(qty) || qty < 1) {
                dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: Order quantity must be an integer >= 1` });
                return false;
            }

            if (line.unitCost.trim()) {
                const money = Number(line.unitCost);
                if (!Number.isFinite(money) || money < 0) {
                    dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: Unit cost must be >= 0` });
                    return false;
                }
            }

            const coo = line.coo.trim().toUpperCase();
            if (coo && coo.length !== 2) {
                dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: COO must be 2 characters` });
                return false;
            }

            if (coo && !COO_CODES.includes(coo)) {
                dispatch({ type: "SET_SUBMIT_ERROR", error: `Line ${index + 1}: COO must be a valid ISO country code` });
                return false;
            }
        }

        if (state.shippingFees.trim()) {
            const money = Number(state.shippingFees);
            if (!Number.isFinite(money) || money < 0) {
                dispatch({ type: "SET_HEADER_ERROR", error: 'Shipping fees must be >= 0' });
                return false;
            }
        }

        const titlesToCheck = [
            ...new Set(state.lines.map((line) => line.productTitle.trim()).filter(Boolean)),
        ];
        for (const title of titlesToCheck) {
            try {
                const payload = await apiFetch<{ products: ProductOption[] }>(
                    `/api/shopify/products/search?q=${encodeURIComponent(title)}`
                );
                const exactMatch = payload.products.some(
                    (p) => p.title.toLowerCase() === title.toLowerCase()
                );
                if (!exactMatch) {
                    const lineIndex = state.lines.findIndex(
                        (line) => line.productTitle.trim().toLowerCase() === title.toLowerCase()
                    );
                    dispatch({
                        type: "SET_SUBMIT_ERROR",
                        error: `Line ${lineIndex + 1}: Product "${title}" does not exist in Shopify`,
                    });
                    return false;
                }
            } catch {
                dispatch({
                    type: "SET_SUBMIT_ERROR",
                    error: `Unable to verify product "${title}" in Shopify`,
                });
                return false;
            }
        }

        return true;
    }, [state.vendor, state.lines, state.shippingFees]);

    /* ---- Submit ---- */

    const submit = useCallback(async () => {
        if (readOnly || state.submitting || bootstrap.loading) return;

        if (!bootstrap.csrfToken) {
            dispatch({
                type: "SET_SUBMIT_ERROR",
                error: "Creation failed: missing CSRF token. Reload the page and open the app from Shopify Admin.",
            });
            return;
        }

        const isValid = await validateBeforeSubmit();
        if (!isValid) return;

        const payload = {
            header: {
                vendor: state.vendor.trim(),
                importDuties: state.importDuties,
                importType: state.importType,
                expectedDate: state.expectedDate || null,
                shippingFees: state.shippingFees.trim() ? Number(state.shippingFees) : null,
                shippingFeesCurrency: state.shippingFeesCurrency || DEFAULT_CURRENCY,
                notes: state.notes.trim() || null,
            },
            items: state.lines.map((line) => ({
                existingPoItem: line.existingPoItem,
                sku: line.sku.trim() || null,
                productTitle: line.productTitle.trim(),
                variantTitle: line.variantTitle.trim(),
                orderQty: Number.parseInt(line.orderQty, 10),
                unitCost: line.unitCost.trim() ? Number(line.unitCost) : null,
                unitCostCurrency: line.unitCostCurrency || DEFAULT_CURRENCY,
                hsCode: line.hsCode.trim() || null,
                coo: line.coo.trim().toUpperCase() || null,
            })),
        };

        try {
            dispatch({ type: "SET_SUBMITTING", value: true });
            dispatch({ type: "SET_SUCCESS_MESSAGE", message: null });

            if (mode === "create") {
                const created = await apiFetch<{ poNumber: string }>('/api/purchase-orders', {
                    method: "POST",
                    csrfToken: bootstrap.csrfToken,
                    body: JSON.stringify(payload),
                });

                dispatch({
                    type: "SET_SUCCESS_MESSAGE",
                    message: `Purchase order #${created.poNumber} created successfully.`,
                });

                const nextListHref = withEmbeddedParams(
                    `/purchase-orders?createdPoNumber=${encodeURIComponent(created.poNumber)}`,
                    searchParams
                );
                router.push(nextListHref);
                router.refresh();
            } else {
                const poNumber = initialData?.poNumber;
                if (!poNumber) throw new Error("Missing purchase order number");

                await apiFetch<{ purchaseOrder: PurchaseOrderDto }>(
                    `/api/purchase-orders/${poNumber}`,
                    {
                        method: "PATCH",
                        csrfToken: bootstrap.csrfToken,
                        body: JSON.stringify(payload),
                    }
                );

                dispatch({
                    type: "SET_SUCCESS_MESSAGE",
                    message: `Purchase order #${poNumber} updated successfully.`,
                });
                router.refresh();
            }
        } catch (error) {
            dispatch({ type: "SET_SUBMIT_ERROR", error: "Failed to update purchase order." });
            console.error("Error submitting purchase order form", error);
        } finally {
            dispatch({ type: "SET_SUBMITTING", value: false });
        }
    }, [
        readOnly,
        state.submitting,
        state.vendor,
        state.importDuties,
        state.importType,
        state.expectedDate,
        state.shippingFees,
        state.shippingFeesCurrency,
        state.notes,
        state.lines,
        bootstrap.loading,
        bootstrap.csrfToken,
        mode,
        initialData?.poNumber,
        searchParams,
        router,
        validateBeforeSubmit,
    ]);


    return {
        bootstrap,

        // Header
        header: {
            vendor: state.vendor,
            setVendor: (v: string) => dispatch({ type: "SET_VENDOR", value: v }),
            importDuties: state.importDuties,
            setImportDuties: (v: boolean) => dispatch({ type: "SET_IMPORT_DUTIES", value: v }),
            importType: state.importType,
            setImportType: (v: string) => dispatch({ type: "SET_IMPORT_TYPE", value: v }),
            expectedDate: state.expectedDate,
            setExpectedDate: (v: string) => dispatch({ type: "SET_EXPECTED_DATE", value: v }),
            shippingFees: state.shippingFees,
            setShippingFees: (v: string) => dispatch({ type: "SET_SHIPPING_FEES", value: v }),
            shippingFeesCurrency: state.shippingFeesCurrency,
            setShippingFeesCurrency: (v: string) =>
                dispatch({ type: "SET_SHIPPING_FEES_CURRENCY", value: v }),
            notes: state.notes,
            setNotes: (v: string) => dispatch({ type: "SET_NOTES", value: v }),
        },
        vendors: { allVendorOptions, loading: loadingVendors },

        // Lines
        lines: state.lines,
        immutableBySku,
        addLine,
        removeLine,
        updateLine,

        // Search / autocomplete
        productSuggestions: state.productSuggestions,
        variantSuggestions: state.variantSuggestions,
        variantSearchResults: state.variantSearchResults,
        searchProducts,
        searchVariants,
        selectProduct,
        selectVariant,

        // Popovers
        activeProductPopoverRowId: state.activeProductPopoverRowId,
        setActiveProductPopoverRowId: (action: SetStateAction<string | null>) => {
            const rowId = typeof action === "function" ? action(state.activeProductPopoverRowId) : action;
            dispatch({ type: "SET_ACTIVE_PRODUCT_POPOVER", rowId });
        },
        activeVariantPopoverRowId: state.activeVariantPopoverRowId,
        setActiveVariantPopoverRowId: (action: SetStateAction<string | null>) => {
            const rowId = typeof action === "function" ? action(state.activeVariantPopoverRowId) : action;
            dispatch({ type: "SET_ACTIVE_VARIANT_POPOVER", rowId });
        },
        activeCooPopoverRowId: state.activeCooPopoverRowId,
        setActiveCooPopoverRowId: (action: SetStateAction<string | null>) => {
            const rowId = typeof action === "function" ? action(state.activeCooPopoverRowId) : action;
            dispatch({ type: "SET_ACTIVE_COO_POPOVER", rowId });
        },

        // Validation
        validateSkuForLine,
        isSkuValidationLoading,

        // Status
        headerError: state.headerError,
        submitError: state.submitError,
        successMessage: state.successMessage,
        submitting: state.submitting,
        submit,

        // Navigation
        purchaseOrdersHref,
        router,
    };
}
