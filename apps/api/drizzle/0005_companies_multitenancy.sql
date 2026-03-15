CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"nif" varchar(50) NOT NULL,
	"mobile_phone" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"iban" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "companies_slug_unique" ON "companies" ("slug");
--> statement-breakpoint
INSERT INTO "companies" (
	"name",
	"slug",
	"address",
	"nif",
	"mobile_phone",
	"email",
	"iban"
)
VALUES (
	'Default Company',
	'default-company',
	'Rua Principal, 1',
	'500000000',
	'910000000',
	'default@floripa.local',
	'PT50000201231234567890154'
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "employees" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "employee_teams" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "gardens" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "product_usage" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
ALTER TABLE "quotes" ADD COLUMN "company_id" uuid;
--> statement-breakpoint
DO $$
DECLARE
	default_company_id uuid;
BEGIN
	SELECT "id"
	INTO default_company_id
	FROM "companies"
	WHERE "slug" = 'default-company'
	LIMIT 1;

	IF default_company_id IS NULL THEN
		RAISE EXCEPTION 'Default company not found';
	END IF;

	UPDATE "employees"
	SET "company_id" = default_company_id
	WHERE "company_id" IS NULL;

	UPDATE "teams"
	SET "company_id" = default_company_id
	WHERE "company_id" IS NULL;

	UPDATE "gardens"
	SET "company_id" = default_company_id
	WHERE "company_id" IS NULL;

	UPDATE "products"
	SET "company_id" = default_company_id
	WHERE "company_id" IS NULL;

	UPDATE "quotes"
	SET "company_id" = default_company_id
	WHERE "company_id" IS NULL;

	UPDATE "employee_teams" AS "et"
	SET "company_id" = "e"."company_id"
	FROM "employees" AS "e"
	WHERE "et"."employee_id" = "e"."id"
	  AND "et"."company_id" IS NULL;

	UPDATE "tasks" AS "t"
	SET "company_id" = "g"."company_id"
	FROM "gardens" AS "g"
	WHERE "t"."garden_id" = "g"."id"
	  AND "t"."company_id" IS NULL;

	UPDATE "work_logs" AS "wl"
	SET "company_id" = "t"."company_id"
	FROM "tasks" AS "t"
	WHERE "wl"."task_id" = "t"."id"
	  AND "wl"."company_id" IS NULL;

	UPDATE "payments" AS "p"
	SET "company_id" = "g"."company_id"
	FROM "gardens" AS "g"
	WHERE "p"."garden_id" = "g"."id"
	  AND "p"."company_id" IS NULL;

	UPDATE "product_usage" AS "pu"
	SET "company_id" = "g"."company_id"
	FROM "gardens" AS "g"
	WHERE "pu"."garden_id" = "g"."id"
	  AND "pu"."company_id" IS NULL;
END $$;
--> statement-breakpoint
ALTER TABLE "employees" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "employee_teams" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "teams" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "gardens" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "work_logs" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_usage" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "employee_teams" ADD CONSTRAINT "employee_teams_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "gardens" ADD CONSTRAINT "gardens_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "work_logs" ADD CONSTRAINT "work_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "product_usage" ADD CONSTRAINT "product_usage_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "employees_user_company_unique" ON "employees" ("user_id", "company_id");
