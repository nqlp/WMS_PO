import type { FormLine } from '@/components/po-form.types';

export function lineId(): string {
    return Math.random().toString(36).slice(2, 12);
}

export function emptyLine(): FormLine {
    return {
        rowId: lineId(),
        sku: "",
        productId: null,
        productTitle: "",
        variantId: null,
        variantTitle: "",
        orderQty: "1",
        unitCost: "",
        skuError: null
    };
}

export function decimalText(value: string | number | null): string {
    if (value == null) {
        return "";
    }

    if (typeof value === "number") {
        return value.toFixed(2);
    }

    return value;
}

export function eventValue(event: unknown): string {
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

export function eventValues(event: unknown): string[] {
    const currentValues = (event as { currentTarget?: { values?: unknown } }).currentTarget?.values;
    if (Array.isArray(currentValues)) {
        return currentValues.filter((value): value is string => typeof value === "string");
    }

    const currentValue = (event as { currentTarget?: { value?: unknown } }).currentTarget?.value;
    if (typeof currentValue === "string") {
        return [currentValue];
    }

    const targetValues = (event as { target?: { values?: unknown } }).target?.values;
    if (Array.isArray(targetValues)) {
        return targetValues.filter((value): value is string => typeof value === "string");
    }

    const targetValue = (event as { target?: { value?: unknown } }).target?.value;
    if (typeof targetValue === "string") {
        return [targetValue];
    }

    return [];
}
