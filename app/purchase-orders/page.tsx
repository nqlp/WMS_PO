import { Suspense } from 'react';

import { PurchaseOrderListPage } from '@/components/PurchaseOrderListPage';

export default function PurchaseOrderListRoute() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrderListPage />
    </Suspense>
  );
}
