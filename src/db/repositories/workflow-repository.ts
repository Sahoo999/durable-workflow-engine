import { and, desc, eq } from "drizzle-orm";
import { db } from "../client.js";
import {
  workflows,
  workflowVersions,
  workflowRuns,
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