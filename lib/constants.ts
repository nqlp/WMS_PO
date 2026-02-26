export const PO_HEADER_STATUS = [
  "OPEN",
  "CHECKEDIN",
  "PART_RECEIVED",
  "RECEIVED",
  "CLOSED",
  "ARCHIVED"
] as const;

export const PO_IMPORT_DUTIES = [
  "All",
  "Yes",
  "No"
] as const;

export const PO_ITEM_STATUS = [
  "OPEN",
  "PART_RECEIVED",
  "RECEIVED",
  "CLOSED",
  "ARCHIVED"
] as const;

export const IMPORT_TYPES = [
  "NO_IMPORT",
  "BROKERAGE_ONLY",
  "BROKERAGE_TRANSPORT_CA",
  "BROKERAGE_TRANSPORT_ALL"
] as const;

export const PO_TABLE_HEADERS = [
  "PO Number",
  "Vendor",
  "Item#",
  "Pieces",
  "Status",
  "Creation date",
  "Last modification date",
  "Expected date",
  "Import duties",
  "Import Type",
  "Notes",
  "Actions"
] as const;

export const TARGET_FIELDS = [
  "sku",
  "productHandle",
  "variantTitle",
  "orderQty",
  "unitCost"
] as const;

export const PO_CURRENCIES = ["CAD", "USD", "EUR", "JPY", "NOK", "CNY", "AUD", "SGD"] as const;

export type PoHeaderStatus = (typeof PO_HEADER_STATUS)[number];
export type PoItemStatus = (typeof PO_ITEM_STATUS)[number];
export type ImportType = (typeof IMPORT_TYPES)[number];
export type Currency = (typeof PO_CURRENCIES)[number];
export const DEFAULT_CURRENCY: Currency = "CAD";
export type TargetFields = (typeof TARGET_FIELDS)[number];