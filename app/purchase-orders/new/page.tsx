import { Suspense } from 'react';

import { PurchaseOrderCreatePage } from '@/components/PurchaseOrderCreatePage';

export default function PurchaseOrderCreateRoute() {
  return (
    <Suspense fallback={null}>
      <PurchaseOrderCreatePage />
    </Suspense>
  );
}
