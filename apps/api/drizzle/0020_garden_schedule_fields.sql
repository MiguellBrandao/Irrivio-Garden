ALTER TABLE "gardens"
ADD COLUMN "is_regular_service" boolean DEFAULT true NOT NULL,
ADD COLUMN "show_in_calendar" boolean DEFAULT true NOT NULL,
ADD COLUMN "maintenance_day_of_week" varchar(20),
ADD COLUMN "maintenance_anchor_date" date,
ADD COLUMN "maintenance_start_time" time,
ADD COLUMN "maintenance_end_time" time;
