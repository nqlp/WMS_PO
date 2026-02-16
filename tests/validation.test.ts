import { describe, expect, it } from 'vitest';

import { createPurchaseOrderSchema } from '../lib/validation/po';

describe('createPurchaseOrderSchema', () => {
  it('rejects coo with invalid length', () => {
    const parsed = createPurchaseOrderSchema.safeParse({
      header: {
        vendor: 'Vendor A',
        importDuties: false,
        importType: 'NO_IMPORT',
        expectedDate: null,
        shippingFees: null,
        shippingFeesCurrency: 'CAD',
        notes: null
      },
      items: [
        {
          productTitle: 'Product',
          variantTitle: 'Variant',
          sku: null,
          orderQty: 1,
          unitCost: 10,
          unitCostCurrency: 'CAD',
          hsCode: null,
          coo: 'CAN'
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });

  it('rejects negative order quantity', () => {
    const parsed = createPurchaseOrderSchema.safeParse({
      header: {
        vendor: 'Vendor A',
        importDuties: false,
        importType: 'NO_IMPORT',
        expectedDate: null,
        shippingFees: null,
        shippingFeesCurrency: 'CAD',
        notes: null
      },
      items: [
        {
          productTitle: 'Product',
          variantTitle: 'Variant',
          sku: null,
          orderQty: 0,
          unitCost: 10,
          unitCostCurrency: 'CAD',
          hsCode: null,
          coo: 'CA'
        }
      ]
    });

    expect(parsed.success).toBe(false);
  });
});
