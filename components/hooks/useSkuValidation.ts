"use client";
import { useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/client/api";
import type { FormLine } from "@/components/po-form.types";
import type { FormAction } from "@/components/usePurchaseOrderForm";

export function useSkuValidation(params: {
    lines: FormLine[];
    validatingSkuRows: Set<string>;
    dispatch: React.Dispatch<FormAction>;
}): {
    validateSkuForLine: (rowId: string) => Promise<void>;
    isSkuValidationLoading: boolean;
} {

    const isSkuValidationLoading = params.validatingSkuRows.size > 0;
    useEffect(() => {
        document.body.classList.toggle("sku-loading-cursor", isSkuValidationLoading);
        return () => {
            document.body.classList.remove("sku-loading-cursor");
        };
    }, [isSkuValidationLoading]);

    const { lines, dispatch } = params;
    const validateSkuForLine = useCallback(async (rowId: string) => {
        const row = lines.find((line) => line.rowId === rowId);
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
                    skuError: null,
                }),
            });

            dispatch({ type: "SET_PRODUCT_SUGGESTIONS", rowId, products: [] });
            dispatch({ type: "SET_VARIANT_SUGGESTIONS", rowId, variants: [] });
            dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "product" });
            dispatch({ type: "CLEAR_POPOVER_IF_MATCH", rowId, target: "variant" });
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
        [lines, dispatch]
    );

    return {
        validateSkuForLine,
        isSkuValidationLoading,
    };

}


