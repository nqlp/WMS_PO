import { Suspense } from 'react';

import { PurchaseOrderEditPage } from '@/components/purchase-order-edit-page';

export default async function PurchaseOrderEditRoute({
  params
}: {
  params: Promise<{ poNumber: string }>;
}) {
  const { poNumber } = await params;
  return (
    <Suspense fallback={null}>
      <PurchaseOrderEditPage poNumber={poNumber} />
    </Suspense>
  );
}
