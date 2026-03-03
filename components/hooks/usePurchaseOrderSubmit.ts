"use client";

import { useCallback } from "react";
import { useRouter, type ReadonlyURLSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/client/api";
import { withEmbeddedParams } from "@/lib/client/embedded-url";
import { DEFAULT_CURRENCY } from "@/lib/constants";
import type { PurchaseOrderDto } from "@/components/po-form.types";
import type { FormState, FormAction } from "@/components/usePurchaseOrderForm";

export function usePurchaseOrderSubmit(params: {
    state: FormState;
    dispatch: React.Dispatch<FormAction>;
    bootstrap: {
        loading: boolean;
        error: string | null;
        csrfToken: string | null;
    };
    mode: "create" | "edit";
    initialData: PurchaseOrderDto | undefined;
    readOnly: boolean;
    searchParams: ReadonlyURLSearchParams;
    router: ReturnType<typeof useRouter>;
}): {
    submit: () => Promise<void>;
} {
    const { state, dispatch, bootstrap, mode, initialData, readOnly, searchParams, router } = params;

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
        }

        if (state.shippingFees.trim()) {
            const money = Number(state.shippingFees);
            if (!Number.isFinite(money) || money < 0) {
                dispatch({ type: "SET_HEADER_ERROR", error: "Shipping fees must be >= 0" });
                return false;
            }
        }

        return true;
    }, [state.vendor, state.lines, state.shippingFees, dispatch]);

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
                purchaseOrderCurrency: state.purchaseOrderCurrency || DEFAULT_CURRENCY,
                notes: state.notes.trim() || null,
            },
            items: state.lines.map((line) => ({
                existingPoItem: line.existingPoItem,
                sku: line.sku.trim() || null,
                productTitle: line.productTitle.trim(),
                variantTitle: line.variantTitle.trim(),
                orderQty: Number.parseInt(line.orderQty, 10),
                unitCost: line.unitCost.trim() ? Number(line.unitCost) : null,
            })),
        };

        try {
            dispatch({ type: "SET_SUBMITTING", value: true });
            dispatch({ type: "SET_SUCCESS_MESSAGE", message: null });

            if (mode === "create") {
                const created = await apiFetch<{ poNumber: string }>("/api/purchase-orders", {
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
            const message = error instanceof Error ? error.message : "Failed to save purchase order.";
            dispatch({ type: "SET_SUBMIT_ERROR", error: message });
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
        state.purchaseOrderCurrency,
        state.notes,
        state.lines,
        bootstrap.loading,
        bootstrap.csrfToken,
        mode,
        initialData?.poNumber,
        searchParams,
        router,
        dispatch,
        validateBeforeSubmit,
    ]);

    return { submit };
}
