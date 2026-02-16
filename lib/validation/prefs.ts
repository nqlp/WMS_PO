import { z } from 'zod';

import { IMPORT_TYPES, PO_HEADER_STATUS } from '@/lib/constants';

export const userPrefsSchema = z.object({
  filters: z
    .object({
      status: z.enum(PO_HEADER_STATUS).optional().nullable(),
      vendor: z.string().optional().nullable(),
      poNumber: z.string().optional().nullable(),
      expectedDateStart: z.string().optional().nullable(),
      expectedDateEnd: z.string().optional().nullable(),
      createdAtStart: z.string().optional().nullable(),
      createdAtEnd: z.string().optional().nullable(),
      importDuties: z.boolean().optional().nullable(),
      importType: z.enum(IMPORT_TYPES).optional().nullable(),
      hasNotes: z.boolean().optional().nullable()
    })
    .optional()
    .nullable(),
  sorting: z
    .object({
      sortBy: z.enum(['poNumber', 'createdAt', 'expectedDate', 'status', 'vendor']).default('createdAt'),
      sortDirection: z.enum(['asc', 'desc']).default('desc')
    })
    .optional()
    .nullable()
});

export type UserPrefsInput = z.infer<typeof userPrefsSchema>;
