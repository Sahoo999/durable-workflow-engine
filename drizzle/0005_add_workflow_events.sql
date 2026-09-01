CREATE TABLE "workflow_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_run_id" uuid NOT NULL,
	"task_id" uuid,
	"task_attempt_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_workflow_run_id_workflow_runs_id_fk" FOREIGN KEY ("workflow_run_id") REFERENCES "public"."workflow_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_task_attempt_id_task_attempts_id_fk" FOREIGN KEY ("task_attempt_id") REFERENCES "public"."task_attempts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workflow_events_workflow_run_id_idx" ON "workflow_events" USING btree ("workflow_run_id");--> statement-breakpoint
CREATE INDEX "workflow_events_task_id_idx" ON "workflow_events" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "workflow_events_created_at_idx" ON "workflow_events" USING btree ("created_at");