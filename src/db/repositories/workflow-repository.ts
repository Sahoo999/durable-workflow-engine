import { and, desc, eq } from "drizzle-orm";
import { db } from "../client.js";
import {
  workflows,
  workflowVersions,
  workflowRuns,
  tasks,
} from "../schema.js";

export const getWorkflowByName = async (
  name: string,
) => {
  const result = await db
    .select()
    .from(workflows)
    .where(eq(workflows.name, name))
    .limit(1);

  return result[0] ?? null;
};

export const getWorkflowVersion = async (
  workflowId: string,
  version: number,
) => {
  const result = await db
    .select()
    .from(workflowVersions)
    .where(
      and(
        eq(workflowVersions.workflowId, workflowId),
        eq(workflowVersions.version, version),
      ),
    )
    .limit(1);

  return result[0] ?? null;
};

export const getLatestWorkflowVersion = async (
  workflowId: string,
) => {
  const result = await db
    .select()
    .from(workflowVersions)
    .where(eq(workflowVersions.workflowId, workflowId))
    .orderBy(desc(workflowVersions.version))
    .limit(1);

  return result[0] ?? null;
};

export const createWorkflow = async (
  name: string,
) => {
  const [workflow] = await db
    .insert(workflows)
    .values({ name })
    .returning();

  if (!workflow) {
    throw new Error("Failed to create workflow");
  }

  return workflow;
};

export const createWorkflowVersion = async ({
  workflowId,
  version,
  definition,
}: {
  workflowId: string;
  version: number;
  definition: unknown;
}) => {
  const [workflowVersion] = await db
    .insert(workflowVersions)
    .values({
      workflowId,
      version,
      definition,
    })
    .returning();

  if (!workflowVersion) {
    throw new Error(
      "Failed to create workflow version",
    );
  }

  return workflowVersion;
};

export const createWorkflowRun = async ({
  workflowVersionId,
  input,
}: {
  workflowVersionId: string;
  input?: unknown;
}) => {
  const [run] = await db
    .insert(workflowRuns)
    .values({
      workflowVersionId,
      status: "PENDING",
      input,
    })
    .returning();

  if (!run) {
    throw new Error(
      "Failed to create workflow run",
    );
  }

  return run;
};

export const getAllWorkflows = async () => {
  return db.select().from(workflows);
};

export const getWorkflowRunById = async (
  runId: string,
) => {
  const result = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.id, runId))
    .limit(1);

  return result[0] ?? null;
};

export const updateWorkflowRunStatus = async (
  runId: string,
  status: string,
): Promise<void> => {
  await db
    .update(workflowRuns)
    .set({
      status,
      updatedAt: new Date(),
      ...(status === "RUNNING"
        ? {
            startedAt: new Date(),
          }
        : {}),
      ...(status === "COMPLETED" ||
      status === "FAILED" ||
      status === "CANCELLED"
        ? {
            completedAt: new Date(),
          }
        : {}),
    })
    .where(eq(workflowRuns.id, runId));
};

export const getWorkflowRunTasks = async (
  runId: string,
) => {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.workflowRunId, runId));
};

export const getWorkflowRunsByWorkflowId = async (
  workflowId: string,
) => {
  return db
    .select({
      id: workflowRuns.id,
      workflowVersionId:
        workflowRuns.workflowVersionId,
      status: workflowRuns.status,
      input: workflowRuns.input,
      output: workflowRuns.output,
      startedAt: workflowRuns.startedAt,
      completedAt: workflowRuns.completedAt,
      createdAt: workflowRuns.createdAt,
      updatedAt: workflowRuns.updatedAt,
    })
    .from(workflowRuns)
    .innerJoin(
      workflowVersions,
      eq(
        workflowRuns.workflowVersionId,
        workflowVersions.id,
      ),
    )
    .where(
      eq(workflowVersions.workflowId, workflowId),
    );
};