import { prisma } from '@/lib/prisma';
import type { AuthenticatedSession } from '@/lib/auth/session-token';
import { runShopifyGraphql } from '@/lib/shopify/graphql';

const VENDOR_CACHE_TTL_MS = 30 * 60 * 1_000;

interface ProductsConnection {
  products: {
    edges: Array<{
      cursor: string;
      node: {
        vendor: string;
      };
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor?: string | null;
    };
  };
}

interface ProductSearchResponse {
  products: {
    nodes: Array<{
      id: string;
      title: string;
      vendor: string;
      variants: {
        nodes: Array<{
          id: string;
          title: string;
          sku: string | null;
          selectedOptions: Array<{ name: string; value: string }>;
        }>;
      };
    }>;
  };
}

interface ProductVariantsResponse {
  product: {
    id: string;
    title: string;
    variants: {
      nodes: Array<{
        id: string;
        title: string;
        sku: string | null;
        selectedOptions: Array<{ name: string; value: string }>;
      }>;
    };
  } | null;
}

interface SkuValidationResponse {
  productVariants: {
    nodes: Array<{
      id: string;
      sku: string | null;
      product: { id: string; title: string };
      selectedOptions: Array<{ name: string; value: string }>;
    }>;
  };
}

export interface ShopifyVariantLite {
  id: string;
  sku: string | null;
  title: string;
  variantTitle: string;
}

export interface ShopifyProductLite {
  id: string;
  title: string;
  vendor: string;
  variants: ShopifyVariantLite[];
}

export interface SkuValidationMatch {
  variantId: string;
  sku: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
}

function toVariantTitle(selectedOptions: Array<{ name: string; value: string }>, fallback: string): string {
  const values = selectedOptions.map((option) => option.value).filter(Boolean);
  if (values.length === 0) {
    return fallback;
  }
  return values.join(' - ');
}

async function fetchAllVendorsFromShopify(session: AuthenticatedSession): Promise<string[]> {
  const vendors = new Set<string>();
  let cursor: string | null = null;

  for (;;) {
    const data: ProductsConnection = await runShopifyGraphql<ProductsConnection>(
      session,
      `#graphql
      query VendorScan($cursor: String) {
        products(first: 250, after: $cursor) {
          edges {
            cursor
            node {
              vendor
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      `,
      { cursor }
    );

    for (const edge of data.products.edges) {
      const vendor = edge.node.vendor.trim();
      if (vendor) {
        vendors.add(vendor);
      }
    }

    if (!data.products.pageInfo.hasNextPage || !data.products.pageInfo.endCursor) {
      break;
    }

    cursor = data.products.pageInfo.endCursor;
  }

  return [...vendors].sort((a, b) => a.localeCompare(b));
}

export async function getVendors(session: AuthenticatedSession): Promise<string[]> {
  const cached = await prisma.shopifyVendorCache.findUnique({
    where: { shop: session.shop }
  });

  if (cached && Date.now() - cached.refreshedAt.getTime() < VENDOR_CACHE_TTL_MS) {
    const vendors = cached.vendors;
    if (Array.isArray(vendors)) {
      return vendors.filter((entry): entry is string => typeof entry === 'string');
    }
  }

  const vendors = await fetchAllVendorsFromShopify(session);

  await prisma.shopifyVendorCache.upsert({
    where: { shop: session.shop },
    create: {
      shop: session.shop,
      vendors,
      refreshedAt: new Date()
    },
    update: {
      vendors,
      refreshedAt: new Date()
    }
  });

  return vendors;
}

export async function searchProducts(session: AuthenticatedSession, rawQuery: string): Promise<ShopifyProductLite[]> {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  const data = await runShopifyGraphql<ProductSearchResponse>(
    session,
    `#graphql
    query SearchProducts($query: String!) {
      products(first: 20, query: $query) {
        nodes {
          id
          title
          vendor
          variants(first: 50) {
            nodes {
              id
              title
              sku
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
    `,
    { query }
  );

  return data.products.nodes.map((product) => ({
    id: product.id,
    title: product.title,
    vendor: product.vendor,
    variants: product.variants.nodes.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      title: variant.title,
      variantTitle: toVariantTitle(variant.selectedOptions, variant.title)
    }))
  }));
}

export async function getProductVariants(session: AuthenticatedSession, productId: string): Promise<ShopifyVariantLite[]> {
  const data = await runShopifyGraphql<ProductVariantsResponse>(
    session,
    `#graphql
    query ProductVariants($id: ID!) {
      product(id: $id) {
        id
        title
        variants(first: 100) {
          nodes {
            id
            title
            sku
            selectedOptions {
              name
              value
            }
          }
        }
      }
    }
    `,
    { id: productId }
  );

  if (!data.product) {
    return [];
  }

  return data.product.variants.nodes.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    title: variant.title,
    variantTitle: toVariantTitle(variant.selectedOptions, variant.title)
  }));
}

export async function validateSku(session: AuthenticatedSession, rawSku: string): Promise<SkuValidationMatch[]> {
  const sku = rawSku.trim();
  if (!sku) {
    return [];
  }

  const data = await runShopifyGraphql<SkuValidationResponse>(
    session,
    `#graphql
    query ValidateSku($query: String!) {
      productVariants(first: 20, query: $query) {
        nodes {
          id
          sku
          product {
            id
            title
          }
          selectedOptions {
            name
            value
          }
        }
      }
    }
    `,
    { query: `sku:${sku}` }
  );

  const normalizedSku = sku.toLowerCase();

  return data.productVariants.nodes
    .filter((variant) => variant.sku?.toLowerCase() === normalizedSku)
    .map((variant) => ({
      variantId: variant.id,
      sku: variant.sku ?? sku,
      productId: variant.product.id,
      productTitle: variant.product.title,
      variantTitle: toVariantTitle(variant.selectedOptions, 'Default Title')
    }));
}
