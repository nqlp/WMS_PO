import { Suspense } from 'react';

import { PurchaseOrderCreatePage } from '@/components/purchase-order-create-page';

export default function PurchaseOrderCreateRoute() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrderCreatePage />
    </Suspense>
  );
}
