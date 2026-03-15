ALTER TABLE "quotes" DROP COLUMN "client_name";
ALTER TABLE "quotes" DROP COLUMN "address";
ALTER TABLE "quotes" DROP COLUMN "description";
ALTER TABLE "quotes" DROP COLUMN "status";

ALTER TABLE "quotes"
ADD COLUMN "garden_id" uuid NOT NULL REFERENCES "public"."gardens"("id") ON DELETE cascade;

ALTER TABLE "quotes"
ADD COLUMN "services" text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE "quotes"
ADD COLUMN "valid_until" date NOT NULL DEFAULT ((now() + interval '1 month')::date);
