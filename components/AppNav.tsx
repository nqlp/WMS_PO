"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { withEmbeddedParams } from "@/lib/client/embedded-url";

export function AppNav() {
  const searchParams = useSearchParams();
  const createHref = withEmbeddedParams("/purchase-orders/new", searchParams);
  const listHref = withEmbeddedParams("/purchase-orders", searchParams);
  const logsHref = withEmbeddedParams("/logs", searchParams);

  return (
    <ui-nav-menu>
      <Link href={createHref}>Purchase order creation</Link>
      <Link href={listHref}>Purchase order list</Link>
      <Link href={logsHref}>Logs</Link>
    </ui-nav-menu>
  );
}
