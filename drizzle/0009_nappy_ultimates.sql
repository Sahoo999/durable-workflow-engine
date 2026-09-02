ALTER TABLE "task_attempts" ADD COLUMN "last_heartbeat_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "last_heartbeat_at";