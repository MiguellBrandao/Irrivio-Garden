ALTER TABLE "companies" ADD COLUMN "logo_path" varchar(255);
--> statement-breakpoint
UPDATE "companies"
SET "logo_path" = '/companies/floripa-jardins.png'
WHERE "slug" = 'floripa-jardins' AND "logo_path" IS NULL;
