ALTER TABLE "products"
ADD COLUMN "unit_price" numeric(10, 2) NOT NULL DEFAULT '0';

DO $$ BEGIN
 CREATE TYPE "public"."stock_rule_operator_enum" AS ENUM('lt', 'lte', 'eq', 'gt', 'gte');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

CREATE TABLE "stock_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "operator" "stock_rule_operator_enum" NOT NULL,
  "threshold_quantity" numeric(10, 2) NOT NULL,
  "emails" text[] DEFAULT ARRAY[]::text[] NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "stock_rules"
ADD CONSTRAINT "stock_rules_company_id_companies_id_fk"
FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "stock_rules"
ADD CONSTRAINT "stock_rules_product_id_products_id_fk"
FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
