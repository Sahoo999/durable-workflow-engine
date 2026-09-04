import {
  createWorkflowRun,
  getWorkflowByName,
  getWorkflowVersion,
} from "../db/repositories/workflow-repository.js";

import {
  createTasksForWorkflowRun,
} from "../db/repositories/task-repository.js";

import {
  dispatchReadyTasks,
} from "./workflow-orchestrator.js";

import {
  updateWorkflowRunStatus,
} from "../db/repositories/workflow-repository.js";

interface WorkflowDefinitionTask {
  id: string;
  type: string;
  dependsOn?: string[];
}

interface WorkflowDefinition {
  name: string;
  version: number;
  tasks: WorkflowDefinitionTask[];
}

export const startWorkflowRun = async ({
  workflowName,
  version,
  input,
}: {
  workflowName: string;
  version: number;
  input?: unknown;
}) => {
  const workflow =
    await getWorkflowByName(workflowName);

  if (!workflow) {
    throw new Error(
      `Workflow not found: ${workflowName}`,
    );
  }

  const workflowVersion =
    await getWorkflowVersion(
      workflow.id,
      version,
    );

  if (!workflowVersion) {
    throw new Error(
      `Workflow version not found: ${workflowName} v${version}`,
    );
  }

  const definition =
    workflowVersion.definition as WorkflowDefinition;

  if (
    !definition ||
    !Array.isArray(definition.tasks)
  ) {
    throw new Error(
      `Workflow version ${workflowName} v${version} has an invalid definition`,
    );
  }

  const run = await createWorkflowRun({
    workflowVersionId:
      workflowVersion.id,
    input,
  });

  await createTasksForWorkflowRun(
    run.id,
    definition.tasks,
  );

  await updateWorkflowRunStatus(
  run.id,
  "RUNNING",
);

await dispatchReadyTasks(run.id);

  return run;
};