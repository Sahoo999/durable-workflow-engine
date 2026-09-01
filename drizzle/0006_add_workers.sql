CREATE TABLE "workers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"worker_key" text NOT NULL,
	"status" text NOT NULL,
	"hostname" text,
	"last_heartbeat_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workers_worker_key_unique" UNIQUE("worker_key")
);
--> statement-breakpoint
CREATE INDEX "workers_status_idx" ON "workers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "workers_last_heartbeat_at_idx" ON "workers" USING btree ("last_heartbeat_at");