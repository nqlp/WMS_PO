export function normalizeHsCode(hscode: string | null | undefined): string | null {
  const value = hscode?.trim();
  if (!value) {
    return null;
  }

  // Shopify can return 6 digits without separator: format as XXXX.XX.
  // check if value has no "." and is exactly 6 digits
  if (!value.includes(".") && /^\d{6}$/.test(value)) {
    return `${value.slice(0, 4)}.${value.slice(4)}`;
  }

  return value;
}
