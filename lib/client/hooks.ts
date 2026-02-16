'use client';

import { useEffect, useState } from 'react';

import { ensureTokenExchange, fetchCsrfToken } from '@/lib/client/api';

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
      } catch (cause) {
        if (isMounted) {
          setError(cause instanceof Error ? cause.message : 'Failed to initialize Shopify session');
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
