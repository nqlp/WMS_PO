"use client";

import { CurrencyOptions, ImportTypeOptions, VendorOptions } from '@/components/PurchaseOrderUIOptions';
import { eventValue } from '@/components/po-form.utils';

interface PurchaseOrderHeaderProps {
    readOnly: boolean;
    header: {
        vendor: string;
        setVendor: (v: string) => void;
        importDuties: boolean;
        setImportDuties: (v: boolean) => void;
        importType: string;
        setImportType: (v: string) => void;
        expectedDate: string;
        setExpectedDate: (v: string) => void;
        shippingFees: string;
        setShippingFees: (v: string) => void;
        purchaseOrderCurrency: string;
        setPurchaseOrderCurrency: (v: string) => void;
        notes: string;
        setNotes: (v: string) => void;
    };
    vendors: {
        allVendorOptions: string[];
        loading: boolean;
    };
}

export function PurchaseOrderHeader({ readOnly, header, vendors }: PurchaseOrderHeaderProps) {
    return (
        <s-query-container>
            <s-grid
                gap="base"
                gridTemplateColumns="repeat(auto-fit, minmax(240px, 1fr))"
            >
                <s-grid-item>
                    <s-select label="Vendor" value={header.vendor} disabled={readOnly} onChange={(event: Event) => header.setVendor(eventValue(event))}>
                        <s-option value="">
                            {vendors.loading ? "Loading vendors..." : "Select Vendor"}
                        </s-option>
                        <VendorOptions vendors={vendors.allVendorOptions} />
                    </s-select>
                </s-grid-item>

                <s-grid-item>
                    <s-select
                        label="Import Duties"
                        value={header.importDuties ? "true" : "false"}
                        disabled={readOnly}
                        onChange={(event: Event) => header.setImportDuties(eventValue(event) === "true")}
                    >
                        <s-option value="false">No</s-option>
                        <s-option value="true">Yes</s-option>
                    </s-select>
                </s-grid-item>

                <s-grid-item>
                    <s-select
                        label="Import Type"
                        value={header.importType}
                        disabled={readOnly}
                        onChange={(event: Event) => header.setImportType(eventValue(event))}
                    >
                        <ImportTypeOptions />
                    </s-select>
                </s-grid-item>

                <s-grid-item>
                    <s-date-field
                        type="single"
                        label="Expected On"
                        value={header.expectedDate}
                        disabled={readOnly}
                        onChange={(event: Event) => header.setExpectedDate(eventValue(event))}
                    />
                </s-grid-item>

                <s-grid-item>
                    <s-number-field
                        label="Shipping Fees"
                        value={header.shippingFees}
                        min="0"
                        step="0.01"
                        disabled={readOnly}
                        onInput={(event: Event) => header.setShippingFees(eventValue(event))}
                    />
                </s-grid-item>

                <s-grid-item>
                    <s-select
                        label="PO Currency"
                        value={header.purchaseOrderCurrency}
                        disabled={readOnly}
                        onChange={(event: Event) => header.setPurchaseOrderCurrency(eventValue(event))}
                    >
                        <CurrencyOptions />
                    </s-select>
                </s-grid-item>

                <s-grid-item>
                    <s-text-area
                        label="Notes"
                        value={header.notes}
                        disabled={readOnly}
                        onInput={(event: Event) => header.setNotes(eventValue(event))}
                    />
                </s-grid-item>
            </s-grid>
        </s-query-container>
    );
}
