import { Suspense } from 'react';

import { PurchaseOrderListPage } from '@/components/purchase-order-list-page';

export default function PurchaseOrderListRoute() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrderListPage />
    </Suspense>
  );
}
