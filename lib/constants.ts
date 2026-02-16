export const PO_HEADER_STATUS = [
  'OPEN',
  'CHECKEDIN',
  'PART_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'ARCHIVED'
] as const;

export const PO_ITEM_STATUS = [
  'OPEN',
  'PART_RECEIVED',
  'RECEIVED',
  'CLOSED',
  'ARCHIVED'
] as const;

export const IMPORT_TYPES = [
  'NO_IMPORT',
  'BROKERAGE_ONLY',
  'BROKERAGE_TRANSPORT_CA',
  'BROKERAGE_TRANSPORT_ALL'
] as const;

export const CURRENCIES = ['CAD', 'USD', 'EUR', 'JPY', 'NOK', 'CNY', 'AUD', 'SGD'] as const;

export type PoHeaderStatus = (typeof PO_HEADER_STATUS)[number];
export type PoItemStatus = (typeof PO_ITEM_STATUS)[number];
export type ImportType = (typeof IMPORT_TYPES)[number];
export type Currency = (typeof CURRENCIES)[number];
