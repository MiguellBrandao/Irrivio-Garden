DO $$ BEGIN
 CREATE TYPE "public"."expense_category_enum" AS ENUM('fuel', 'tolls', 'parking', 'equipment', 'maintenance', 'transport', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"garden_id" uuid NOT NULL,
	"category" "expense_category_enum" NOT NULL,
	"description" text,
	"date" date NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "expenses" ADD CONSTRAINT "expenses_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
