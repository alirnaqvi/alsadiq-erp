-- Phase 2: roles extras, 2FA, donor app, extra receipt names, assets, inventory
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_secret" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totp_enabled" boolean NOT NULL DEFAULT false;

ALTER TABLE "donors" ADD COLUMN IF NOT EXISTS "additional_names" text;
ALTER TABLE "donors" ADD COLUMN IF NOT EXISTS "app_pin_hash" text;

ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "additional_names" text;
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "source" varchar(24) NOT NULL DEFAULT 'staff';
ALTER TABLE "donations" ADD COLUMN IF NOT EXISTS "share_token" varchar(40);
CREATE UNIQUE INDEX IF NOT EXISTS "donations_share_token_key" ON "donations" ("share_token");

CREATE TABLE IF NOT EXISTS "donor_registrations" (
  "id" serial PRIMARY KEY NOT NULL,
  "full_name" varchar(140) NOT NULL,
  "mobile" varchar(24) NOT NULL,
  "email" varchar(160),
  "cnic" varchar(20),
  "address" text,
  "city" varchar(80),
  "additional_names" text,
  "pin_hash" text NOT NULL,
  "notes" text,
  "status" varchar(16) NOT NULL DEFAULT 'pending',
  "reviewed_by_id" integer,
  "review_note" text,
  "reviewed_at" timestamp with time zone,
  "donor_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "reg_status_idx" ON "donor_registrations" ("status");
CREATE INDEX IF NOT EXISTS "reg_mobile_idx" ON "donor_registrations" ("mobile");

CREATE TABLE IF NOT EXISTS "assets" (
  "id" serial PRIMARY KEY NOT NULL,
  "asset_code" varchar(20) NOT NULL UNIQUE,
  "name" varchar(160) NOT NULL,
  "category" varchar(80),
  "location" varchar(120),
  "serial_no" varchar(80),
  "purchase_date" date,
  "purchase_value" numeric(12, 2),
  "status" varchar(24) NOT NULL DEFAULT 'in_use',
  "notes" text,
  "created_by_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "assets" ("status");

CREATE TABLE IF NOT EXISTS "inventory_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "item_code" varchar(20) NOT NULL UNIQUE,
  "name" varchar(160) NOT NULL,
  "unit" varchar(24) NOT NULL DEFAULT 'pcs',
  "location" varchar(120),
  "min_qty" numeric(12, 2) NOT NULL DEFAULT '0',
  "qty_on_hand" numeric(12, 2) NOT NULL DEFAULT '0',
  "notes" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_by_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "inv_name_idx" ON "inventory_items" ("name");

CREATE TABLE IF NOT EXISTS "inventory_moves" (
  "id" serial PRIMARY KEY NOT NULL,
  "item_id" integer NOT NULL,
  "kind" varchar(12) NOT NULL,
  "qty" numeric(12, 2) NOT NULL,
  "reason" varchar(160),
  "ref" varchar(80),
  "moved_at" timestamp with time zone NOT NULL DEFAULT now(),
  "created_by_id" integer
);
CREATE INDEX IF NOT EXISTS "inv_moves_item_idx" ON "inventory_moves" ("item_id");

CREATE TABLE IF NOT EXISTS "whatsapp_campaigns" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar(120) NOT NULL,
  "body" text NOT NULL,
  "audience" varchar(40) NOT NULL DEFAULT 'all',
  "recipient_count" integer NOT NULL DEFAULT 0,
  "created_by_id" integer,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
