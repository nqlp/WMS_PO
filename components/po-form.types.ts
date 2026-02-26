export interface PurchaseOrderItemDto {
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
    purchaseOrderCurrency: string | null;
    notes: string | null;
    items: PurchaseOrderItemDto[];
}

export interface ProductOption {
    id: string;
    title: string;
    vendor: string;
    variants: VariantOption[];
}

export interface VariantOption {
    id: string;
    sku: string | null;
    title: string;
    variantTitle: string;
    coo: string | null;
    hsCode: string | null;
    productId?: string;
    productTitle?: string;
}

export interface FormLine {
    rowId: string;
    existingPoItem?: number;
    sku: string;
    productId: string | null;
    productTitle: string;
    variantId: string | null;
    variantTitle: string;
    orderQty: string;
    unitCost: string;
    skuError: string | null;
}

export interface PurchaseOrderFormProps {
    mode: "create" | "edit";
    title: string;
    initialData?: PurchaseOrderDto;
    readOnly?: boolean;
}
