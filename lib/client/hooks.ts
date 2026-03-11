"use client";

import { useEffect, useMemo, useState } from 'react';
import { ensureTokenExchange, fetchCsrfToken, fetchVendors } from '@/lib/client/api';

export function useEmbeddedBootstrap() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        await ensureTokenExchange();
        const token = await fetchCsrfToken();
        if (isMounted) {
          setCsrfToken(token);
        }
      } catch (error) {
        if (isMounted) {
          setError(error instanceof Error ? error.message : "Failed to initialize Shopify session");
          console.error("Failed to initialize Shopify session:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    loading,
    error,
    csrfToken
  };
}

export function useVendors(enabled: boolean = true, currentVendor?: string) {
  const [vendorOptions, setVendorOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (!enabled || fetched) {
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setLoading(true);
        const response = await fetchVendors();
        if (isMounted) {
          setVendorOptions(response);
          setFetched(true);
        }
      } catch (error) {
        if (isMounted) {
          setVendorOptions([]);
          console.error('Failed to fetch vendors:', error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setFetched(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [enabled, fetched]);

  const allVendorOptions = useMemo(() => {
    if (currentVendor && !vendorOptions.includes(currentVendor)) {
      return [currentVendor, ...vendorOptions];
    }
    return vendorOptions;
  }, [currentVendor, vendorOptions]);

  return { allVendorOptions, loading };
}
