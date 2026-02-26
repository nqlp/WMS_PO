import {
  IMPORT_TYPES,
  PO_CURRENCIES,
  PO_HEADER_STATUS,
  PO_IMPORT_DUTIES,
  PO_ITEM_STATUS,
  PO_TABLE_HEADERS
} from "@/lib/constants";

export function CurrencyOptions() {
  return (
    <>
      {PO_CURRENCIES.map((currency) => (
        <s-option key={currency} value={currency}>
          {currency}
        </s-option>
      ))}
    </>
  );
}

export function PoHeaderStatusOptions() {
  return (
    <>
      {PO_HEADER_STATUS.map((status) => (
        <s-option key={status} value={status}>
          {status}
        </s-option>
      ))}
    </>
  );
}

export function PoImportDutiesOptions() {
  return (
    <>
      {PO_IMPORT_DUTIES.map((option) => (
        <s-option key={option} value={option}>
          {option}
        </s-option>
      ))}
    </>
  );
}

export function PoItemStatusOptions() {
  return (
    <>
      {PO_ITEM_STATUS.map((status) => (
        <s-option key={status} value={status}>
          {status}
        </s-option>
      ))}
    </>
  );
}

export function ImportTypeOptions() {
  return (
    <>
      {IMPORT_TYPES.map((option) => (
        <s-option key={option} value={option}>
          {option}
        </s-option>
      ))}
    </>
  );
}

export function PoTableHeaders() {
  return (
    <>
      {PO_TABLE_HEADERS.map((header) => (
        <s-table-header key={header}>{header}</s-table-header>
      ))}
    </>
  );
}

interface VendorOptionsProps {
  vendors: string[];
}

export function VendorOptions({ vendors }: VendorOptionsProps) {
  return (
    <>
      {vendors.map((vendor) => (
        <s-option key={vendor} value={vendor}>
          {vendor}
        </s-option>
      ))}
    </>
  );
}