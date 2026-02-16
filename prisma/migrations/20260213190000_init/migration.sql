-- Core PO tables from table_schema.md (source of truth)
CREATE TABLE "po_header" (
  "po_number" BIGINT GENERATED ALWAYS AS IDENTITY,
  "vendor" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "creation_user" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL,
  "import_duties" BOOLEAN NOT NULL DEFAULT FALSE,
  "Import_type" TEXT NOT NULL DEFAULT 'NO_IMPORT',
  "expected_date" DATE,
  "shipping_fees" NUMERIC(12, 2),
  "shipping_fees_currency" CHAR(3) DEFAULT 'CAD',
  "Notes" TEXT,
  CONSTRAINT "po_header_pkey" PRIMARY KEY ("po_number")
);

CREATE TABLE "po_item" (
  "po_number" BIGINT NOT NULL,
  "po_item" INTEGER NOT NULL,
  "product_title" TEXT NOT NULL,
  "variant_title" TEXT NOT NULL,
  "sku" TEXT,
  "order_qty" INTEGER NOT NULL DEFAULT 1,
  "received_qty" INTEGER DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "unit_cost" NUMERIC(12, 2),
  "unit_cost_currency" CHAR(3) NOT NULL DEFAULT 'CAD',
  "hs_code" TEXT,
  "coo" CHAR(2),
  "last_receiving_Date" TIMESTAMPTZ,
  "last_modification" TIMESTAMPTZ NOT NULL,
  "last_modification_user" TEXT NOT NULL,
  CONSTRAINT "po_item_pkey" PRIMARY KEY ("po_number", "po_item"),
  CONSTRAINT "po_item_po_number_fkey" FOREIGN KEY ("po_number") REFERENCES "po_header"("po_number") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Supporting app tables
CREATE TABLE "shop_installation" (
  "shop" TEXT NOT NULL,
  "encrypted_access_token" TEXT NOT NULL,
  "scopes" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shop_installation_pkey" PRIMARY KEY ("shop")
);

CREATE TABLE "shopify_vendor_cache" (
  "shop" TEXT NOT NULL,
  "vendors" JSONB NOT NULL,
  "refreshed_at" TIMESTAMPTZ NOT NULL,
  CONSTRAINT "shopify_vendor_cache_pkey" PRIMARY KEY ("shop")
);

CREATE TABLE "user_prefs" (
  "shop" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "filters" JSONB,
  "sorting" JSONB,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_prefs_pkey" PRIMARY KEY ("shop", "user_id")
);

CREATE TABLE "po_shop_scope" (
  "po_number" BIGINT NOT NULL,
  "shop" TEXT NOT NULL,
  CONSTRAINT "po_shop_scope_pkey" PRIMARY KEY ("po_number"),
  CONSTRAINT "po_shop_scope_po_number_fkey" FOREIGN KEY ("po_number") REFERENCES "po_header"("po_number") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Constraints for allowed values / checks from schema
ALTER TABLE "po_header"
  ADD CONSTRAINT "po_header_status_chk"
    CHECK ("status" IN ('OPEN', 'CHECKEDIN', 'PART_RECEIVED', 'RECEIVED', 'CLOSED', 'ARCHIVED')),
  ADD CONSTRAINT "po_header_import_type_chk"
    CHECK ("Import_type" IN ('NO_IMPORT', 'BROKERAGE_ONLY', 'BROKERAGE_TRANSPORT_CA', 'BROKERAGE_TRANSPORT_ALL')),
  ADD CONSTRAINT "po_header_shipping_fees_chk"
    CHECK ("shipping_fees" IS NULL OR "shipping_fees" >= 0),
  ADD CONSTRAINT "po_header_shipping_fees_currency_chk"
    CHECK (
      "shipping_fees_currency" IS NULL OR
      "shipping_fees_currency" IN ('CAD', 'USD', 'EUR', 'JPY', 'NOK', 'CNY', 'AUD', 'SGD')
    );

ALTER TABLE "po_item"
  ADD CONSTRAINT "po_item_order_qty_chk"
    CHECK ("order_qty" >= 1),
  ADD CONSTRAINT "po_item_received_qty_chk"
    CHECK ("received_qty" IS NULL OR "received_qty" >= 0),
  ADD CONSTRAINT "po_item_status_chk"
    CHECK ("status" IN ('OPEN', 'PART_RECEIVED', 'RECEIVED', 'CLOSED', 'ARCHIVED')),
  ADD CONSTRAINT "po_item_unit_cost_chk"
    CHECK ("unit_cost" IS NULL OR "unit_cost" >= 0),
  ADD CONSTRAINT "po_item_unit_cost_currency_chk"
    CHECK ("unit_cost_currency" IN ('CAD', 'USD', 'EUR', 'JPY', 'NOK', 'CNY', 'AUD', 'SGD')),
  ADD CONSTRAINT "po_item_coo_len_chk"
    CHECK ("coo" IS NULL OR char_length(trim("coo")) = 2),
  ADD CONSTRAINT "po_item_received_lte_order_chk"
    CHECK ("received_qty" IS NULL OR "received_qty" <= "order_qty");

-- Required indexes
CREATE INDEX "po_header_vendor_idx" ON "po_header" ("vendor");
CREATE INDEX "po_header_status_idx" ON "po_header" ("status");
CREATE INDEX "po_header_created_at_idx" ON "po_header" ("created_at");
CREATE INDEX "po_header_expected_date_idx" ON "po_header" ("expected_date");

CREATE INDEX "po_item_po_number_idx" ON "po_item" ("po_number");
CREATE INDEX "po_item_po_item_idx" ON "po_item" ("po_item");
CREATE INDEX "po_item_product_title_idx" ON "po_item" ("product_title");
CREATE INDEX "po_item_variant_title_idx" ON "po_item" ("variant_title");
CREATE INDEX "po_item_sku_idx" ON "po_item" ("sku");
CREATE INDEX "po_item_status_idx" ON "po_item" ("status");

CREATE INDEX "user_prefs_shop_idx" ON "user_prefs" ("shop");
CREATE INDEX "po_shop_scope_shop_idx" ON "po_shop_scope" ("shop");
