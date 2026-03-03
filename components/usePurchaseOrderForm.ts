"use client";

import { type SetStateAction, useCallback, useMemo, useReducer } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_CURRENCY } from '@/lib/constants';
import { withEmbeddedParams } from '@/lib/client/embedded-url';
import { useEmbeddedBootstrap, useVendors } from '@/lib/client/hooks';
import { lineId, emptyLine, decimalText } from '@/components/po-form.utils';
import type {
    FormLine,
    ProductOption,
    PurchaseOrderDto,
    PurchaseOrderFormProps,
    VariantOption,
} from '@/components/po-form.types';
import { parseCsvHeaders } from '@/lib/po/item-import/parseCsvPurchaseOrderItems';
import { useSkuValidation } from '@/components/hooks/useSkuValidation';
import { useProductSearch } from '@/components/hooks/useProductSearch';
import { usePurchaseOrderSubmit } from '@/components/hooks/usePurchaseOrderSubmit';

/* ------------------------------------------------------------------ */
/*  State                                                              */
/* ------------------------------------------------------------------ */

export interface FormState {
    // Header fields
    vendor: string;
    importDuties: boolean;
    importType: string;
    expectedDate: string;
    shippingFees: string;
    purchaseOrderCurrency: string;
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

export type FormAction =
    // Header
    | { type: "SET_VENDOR"; value: string }
    | { type: "SET_IMPORT_DUTIES"; value: boolean }
    | { type: "SET_IMPORT_TYPE"; value: string }
    | { type: "SET_EXPECTED_DATE"; value: string }
    | { type: "SET_SHIPPING_FEES"; value: string }
    | { type: "SET_PURCHASE_ORDER_CURRENCY"; value: string }
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
    // SKU validation
    | { type: "SKU_VALIDATION_START"; rowId: string }
    | { type: "SKU_VALIDATION_END"; rowId: string }
    // Errors / status
    | { type: "SET_HEADER_ERROR"; error: string | null }
    | { type: "SET_SUBMIT_ERROR"; error: string | null }
    | { type: "SET_SUCCESS_MESSAGE"; message: string | null }
    | { type: "SET_SUBMITTING"; value: boolean }
    // Compound: clear row-specific state on remove
    | { type: "CLEAR_ROW_DATA"; rowId: string }
    // Import items from file
    | { type: "IMPORT_LINES"; lines: FormLine[] };

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
        case "SET_PURCHASE_ORDER_CURRENCY":
            return { ...state, purchaseOrderCurrency: action.value };
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
        case "IMPORT_LINES": {
            const hasSingleLine = state.lines.length === 1;
            const firstLine = state.lines[0];

            const isPlaceholder =
                hasSingleLine &&
                firstLine != null &&
                !firstLine.sku.trim() &&
                !firstLine.productTitle.trim() &&
                !firstLine.variantTitle.trim() &&
                (firstLine.orderQty.trim() === "" || firstLine.orderQty.trim() === "1") &&
                !firstLine.unitCost.trim();

            const nextLines = isPlaceholder
                ? action.lines
                : [...state.lines, ...action.lines];

            return {
                ...state,
                lines: nextLines,
                productSuggestions: {},
                variantSuggestions: {},
                variantSearchResults: {},
                activeProductPopoverRowId: null,
                activeVariantPopoverRowId: null,
                validatingSkuRows: new Set(),
                submitError: null,
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
        case "CLEAR_POPOVER_IF_MATCH": {
            const updates: Partial<FormState> = {};
            if (action.target === "product" && state.activeProductPopoverRowId === action.rowId) {
                updates.activeProductPopoverRowId = null;
            }
            if (action.target === "variant" && state.activeVariantPopoverRowId === action.rowId) {
                updates.activeVariantPopoverRowId = null;
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
        purchaseOrderCurrency: initialData?.purchaseOrderCurrency ?? DEFAULT_CURRENCY,
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
                skuError: null,
            }))
            : [emptyLine()],

        productSuggestions: {},
        variantSuggestions: {},
        variantSearchResults: {},
        activeProductPopoverRowId: null,
        activeVariantPopoverRowId: null,
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

    /* Sub-hooks */
    const { validateSkuForLine, isSkuValidationLoading } = useSkuValidation({
        lines: state.lines,
        validatingSkuRows: state.validatingSkuRows,
        dispatch,
    });

    const { searchProducts, searchVariants, selectProduct, selectVariant } = useProductSearch({
        dispatch,
    });

    const { submit } = usePurchaseOrderSubmit({
        state,
        dispatch,
        bootstrap,
        mode,
        initialData,
        readOnly,
        searchParams,
        router,
    });

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


    const importItemsFromFile = useCallback(async (file: File) => {
        dispatch({ type: "SET_HEADER_ERROR", error: null });

        try {
            const content = await file.text();
            const parsed = parseCsvHeaders(content);

            return parsed
        }


        catch (error) {
            dispatch({
                type: "SET_HEADER_ERROR",
                error: "Failed to parse CSV file.",

            });
            console.error("Failed to parse CSV file", error);
            return null;
        }
    }, []);

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
            purchaseOrderCurrency: state.purchaseOrderCurrency,
            setPurchaseOrderCurrency: (v: string) => dispatch({ type: "SET_PURCHASE_ORDER_CURRENCY", value: v }),
            notes: state.notes,
            setNotes: (v: string) => dispatch({ type: "SET_NOTES", value: v }),
        },
        vendors: { allVendorOptions, loading: loadingVendors },

        // Lines
        lines: state.lines,
        immutableBySku,
        validatingSkuRows: state.validatingSkuRows,
        addLine,
        removeLine,
        updateLine,
        importItemsFromFile,
        importLines: (lines: FormLine[]) => dispatch({ type: "IMPORT_LINES", lines }),

        // Search / autocomplete
        productSuggestions: state.productSuggestions,
        variantSuggestions: state.variantSuggestions,
        variantSearchResults: state.variantSearchResults,
        searchProducts,
        searchVariants,
        selectProduct,
        selectVariant,

        // SKU validation
        validateSkuForLine,
        isSkuValidationLoading,

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