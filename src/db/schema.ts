import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  unique,
  index,
} from "drizzle-orm/pg-core";

export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),

  name: text("name").notNull().unique(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});

export const workflowVersions = pgTable(
  "workflow_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => workflows.id, {
        onDelete: "cascade",
      }),

    version: integer("version").notNull(),

    definition: jsonb("definition").notNull(),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workflowVersionUnique: unique(
      "workflow_versions_workflow_version_unique",
    ).on(table.workflowId, table.version),
  }),
);

export const workflowRuns = pgTable(
  "workflow_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    workflowVersionId: uuid("workflow_version_id")
      .notNull()
      .references(() => workflowVersions.id, {
        onDelete: "restrict",
      }),

    status: text("status").notNull(),

    input: jsonb("input"),

    output: jsonb("output"),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, {
        onDelete: "cascade",
      }),

    taskKey: text("task_key").notNull(),

    taskType: text("task_type").notNull(),

    status: text("status").notNull(),

    input: jsonb("input"),

    output: jsonb("output"),

    dependsOn: jsonb("depends_on")
      .$type<string[]>()
      .notNull()
      .default([]),

    maxAttempts: integer("max_attempts")
      .notNull()
      .default(3),

    backoffType: text("backoff_type")
      .notNull()
      .default("exponential"),

    timeoutMs: integer("timeout_ms"),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workflowRunTaskKeyUnique: unique(
      "tasks_workflow_run_task_key_unique",
    ).on(table.workflowRunId, table.taskKey),

    workflowRunIdx: index(
      "tasks_workflow_run_id_idx",
    ).on(table.workflowRunId),

    statusIdx: index("tasks_status_idx").on(table.status),
  }),
);

export const taskAttempts = pgTable(
  "task_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, {
        onDelete: "cascade",
      }),

    attemptNumber: integer("attempt_number").notNull(),

    status: text("status").notNull(),

    workerId: uuid("worker_id"),

    fencingToken: integer("fencing_token").notNull(),

    input: jsonb("input"),

    output: jsonb("output"),

    error: jsonb("error"),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    completedAt: timestamp("completed_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    taskAttemptUnique: unique(
      "task_attempts_task_attempt_number_unique",
    ).on(table.taskId, table.attemptNumber),

    taskIdx: index("task_attempts_task_id_idx").on(
      table.taskId,
    ),

    statusIdx: index("task_attempts_status_idx").on(
      table.status,
    ),
  }),
);

export const workflowEvents = pgTable(
  "workflow_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    workflowRunId: uuid("workflow_run_id")
      .notNull()
      .references(() => workflowRuns.id, {
        onDelete: "cascade",
      }),

    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),

    taskAttemptId: uuid("task_attempt_id").references(
      () => taskAttempts.id,
      {
        onDelete: "set null",
      },
    ),

    eventType: text("event_type").notNull(),

    payload: jsonb("payload"),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    workflowRunIdx: index(
      "workflow_events_workflow_run_id_idx",
    ).on(table.workflowRunId),

    taskIdx: index(
      "workflow_events_task_id_idx",
    ).on(table.taskId),

    createdAtIdx: index(
      "workflow_events_created_at_idx",
    ).on(table.createdAt),
  }),
);

export const workers = pgTable(
  "workers",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    workerKey: text("worker_key").notNull().unique(),

    status: text("status").notNull(),

    hostname: text("hostname"),

    lastHeartbeatAt: timestamp("last_heartbeat_at", {
      withTimezone: true,
    }),

    startedAt: timestamp("started_at", {
      withTimezone: true,
    }),

    createdAt: timestamp("created_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updated_at", {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    statusIdx: index("workers_status_idx").on(table.status),

    heartbeatIdx: index(
      "workers_last_heartbeat_at_idx",
    ).on(table.lastHeartbeatAt),
  }),
);