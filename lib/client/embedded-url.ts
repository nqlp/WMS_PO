"use client";

import type { ReadonlyURLSearchParams } from 'next/navigation';

type EmbeddedParams = URLSearchParams | ReadonlyURLSearchParams;
const EMBEDDED_KEYS = ["host", "shop", "embedded"];

export function withEmbeddedParams(path: string, currentParams: EmbeddedParams): string {
  const [pathnamePart, query = ""] = path.split("?", 2);
  const pathname = pathnamePart ?? path;
  const mergedParams = new URLSearchParams(query);

  for (const key of EMBEDDED_KEYS) {
    const value = currentParams.get(key);
    if (value) {
      mergedParams.set(key, value);
    }
  }

  const nextQuery = mergedParams.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
}
