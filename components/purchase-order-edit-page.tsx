'use client';

import { useEffect, useState } from 'react';

import { PurchaseOrderForm, type PurchaseOrderDto } from '@/components/purchase-order-form';
import { apiFetch } from '@/lib/client/api';
import { useEmbeddedBootstrap } from '@/lib/client/hooks';

interface PurchaseOrderEditPageProps {
  poNumber: string;
}

export function PurchaseOrderEditPage({ poNumber }: PurchaseOrderEditPageProps) {
  const bootstrap = useEmbeddedBootstrap();
  const [purchaseOrder, setPurchaseOrder] = useState<PurchaseOrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (bootstrap.loading || bootstrap.error) {
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const response = await apiFetch<{ purchaseOrder: PurchaseOrderDto }>(`/api/purchase-orders/${poNumber}`);
        if (mounted) {
          setPurchaseOrder(response.purchaseOrder);
        }
      } catch (error) {
        if (mounted) {
          console.error("Failed to load purchase order:", error);
          setError(error instanceof Error ? error.message : "Failed to load purchase order");
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [bootstrap.error, bootstrap.loading, poNumber]);

  if (bootstrap.error) {
    return <div className="panel error-text">{bootstrap.error}</div>;
  }

  if (error) {
    return <div className="panel error-text">{error}</div>;
  }

  if (!purchaseOrder) {
    return <div className="panel">Loading purchase order #{poNumber}...</div>;
  }

  return (
    <PurchaseOrderForm
      mode="edit"
      title={`Modify Purchase Order #${purchaseOrder.poNumber}`}
      initialData={purchaseOrder}
      readOnly={purchaseOrder.status === "ARCHIVED"}
    />
  );
}
