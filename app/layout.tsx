import type { Metadata } from 'next';
import { Suspense } from 'react';

import { AppNav } from '@/components/app-nav';
import { env } from '@/lib/env';

import './globals.css';

export const metadata: Metadata = {
  title: 'EZOKO Purchase Orders',
  description: 'Embedded Shopify app for purchase order CRUD'
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
        <head>
          <meta name="shopify-api-key" content={env.SHOPIFY_API_KEY} />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {/* App Bridge requires synchronous CDN script loading */}
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" data-api-key={env.SHOPIFY_API_KEY} />
          <script src="https://cdn.shopify.com/shopifycloud/app-home/polaris.js" />
        </head>
      <body>
        <ui-title-bar title="EZOKO Purchase Orders" />
        <Suspense fallback={null}>
          <AppNav />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
