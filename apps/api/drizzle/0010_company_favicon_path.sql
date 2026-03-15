ALTER TABLE "companies" ADD COLUMN "favicon_path" varchar(255);

UPDATE "companies"
SET "favicon_path" = "logo_path"
WHERE "favicon_path" IS NULL
  AND "logo_path" IS NOT NULL;

UPDATE "companies"
SET "favicon_path" = '/companies/floripa-jardins-favicon.png'
WHERE "slug" = 'floripa-jardins';
