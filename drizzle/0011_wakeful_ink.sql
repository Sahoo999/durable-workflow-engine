CREATE TABLE "dead_letter_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"reason" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dead_letter_tasks" ADD CONSTRAINT "dead_letter_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dead_letter_tasks_task_id_idx" ON "dead_letter_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "dead_letter_tasks_created_at_idx" ON "dead_letter_tasks" USING btree ("created_at");