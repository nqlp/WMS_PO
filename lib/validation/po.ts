import { z } from 'zod';

import { PO_CURRENCIES, DEFAULT_CURRENCY, IMPORT_TYPES, PO_HEADER_STATUS } from '@/lib/constants';

const currencySchema = z.enum(PO_CURRENCIES);
const importTypeSchema = z.enum(IMPORT_TYPES);
const poHeaderStatusSchema = z.enum(PO_HEADER_STATUS);

const nonNegativeMoneySchema = z
  .number()
  .finite()
  .min(0)
  .refine((value) => Number(value.toFixed(2)) === value, 'Value must have at most 2 decimal places');

const optionalDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (!value) {
      return null;
    }
    return value;
  })
  .refine((value) => value === null || !Number.isNaN(Date.parse(value)), 'Invalid date');

const lineSchema = z.object({
  existingPoItem: z.number().int().positive().optional(),
  sku: z.string().trim().max(255).optional().nullable(),
  productTitle: z.string().trim().min(1),
  variantTitle: z.string().trim().min(1),
  orderQty: z.number().int().min(1),
  unitCost: nonNegativeMoneySchema.optional().nullable(),
  unitCostCurrency: currencySchema.default(DEFAULT_CURRENCY),
  hsCode: z.string().trim().max(255).optional().nullable(),
  coo: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
});

const headerSchema = z.object({
  vendor: z.string().trim().min(1),
  importDuties: z.boolean(),
  importType: importTypeSchema.default("NO_IMPORT"),
  expectedDate: optionalDateSchema,
  shippingFees: nonNegativeMoneySchema.optional().nullable(),
  purchaseOrderCurrency: currencySchema.optional().nullable(),
  notes: z.string().optional().nullable()
});

export const createPurchaseOrderSchema = z.object({
  header: headerSchema,
  items: z.array(lineSchema).min(1)
});

export const updatePurchaseOrderSchema = z.object({
  status: poHeaderStatusSchema.optional(),
  header: headerSchema,
  items: z.array(lineSchema).min(1)
});

export const listPurchaseOrderFilterSchema = z.object({
  status: poHeaderStatusSchema.optional(),
  vendor: z.string().trim().optional(),
  poNumber: z.coerce.bigint().optional(),
  expectedDateStart: z.string().optional(),
  expectedDateEnd: z.string().optional(),
  createdAtStart: z.string().optional(),
  createdAtEnd: z.string().optional(),
  importDuties: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return value === 'true';
    }),
  importType: importTypeSchema.optional(),
  hasNotes: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => {
      if (!value) {
        return undefined;
      }
      return value === 'true';
    }),
  sortBy: z
    .enum(['poNumber', 'createdAt', 'expectedDate', 'status', 'vendor'])
    .optional()
    .default('createdAt'),
  sortDirection: z.enum(['asc', 'desc']).optional().default('desc'),
  sku: z.string().trim().optional()
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePurchaseOrderInput = z.infer<typeof updatePurchaseOrderSchema>;
export type PurchaseOrderLineInput = z.infer<typeof lineSchema>;
export type PurchaseOrderListFilters = z.infer<typeof listPurchaseOrderFilterSchema>;
