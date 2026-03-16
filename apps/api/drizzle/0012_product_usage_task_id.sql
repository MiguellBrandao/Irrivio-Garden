ALTER TABLE "product_usage"
ADD COLUMN "task_id" uuid REFERENCES "tasks"("id") ON DELETE set null;
