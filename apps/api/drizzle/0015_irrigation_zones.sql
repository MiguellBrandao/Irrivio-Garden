DO $$ BEGIN
 CREATE TYPE "public"."irrigation_frequency_enum" AS ENUM('daily', 'every_n_days', 'weekly');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "irrigation_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"garden_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"frequency_type" "irrigation_frequency_enum" NOT NULL,
	"interval_days" integer,
	"week_days" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"start_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "irrigation_zones" ADD CONSTRAINT "irrigation_zones_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "irrigation_zones" ADD CONSTRAINT "irrigation_zones_garden_id_gardens_id_fk" FOREIGN KEY ("garden_id") REFERENCES "public"."gardens"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
