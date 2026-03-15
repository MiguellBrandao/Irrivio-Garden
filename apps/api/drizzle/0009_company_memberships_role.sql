ALTER TABLE "employees" RENAME TO "company_memberships";

ALTER TABLE "employee_teams" RENAME TO "company_membership_teams";

ALTER TABLE "company_membership_teams"
RENAME COLUMN "employee_id" TO "company_membership_id";

ALTER TABLE "product_usage"
RENAME COLUMN "employee_id" TO "company_membership_id";

ALTER INDEX IF EXISTS "employees_user_company_unique"
RENAME TO "company_memberships_user_company_unique";

ALTER TABLE "company_memberships"
ADD COLUMN "role" varchar(50);

UPDATE "company_memberships" AS "cm"
SET "role" = COALESCE("u"."role", 'employee')
FROM "users" AS "u"
WHERE "cm"."user_id" = "u"."id";

UPDATE "company_memberships"
SET "role" = 'employee'
WHERE "role" IS NULL;

ALTER TABLE "company_memberships"
ALTER COLUMN "role" SET NOT NULL;

ALTER TABLE "users"
DROP COLUMN "role";
