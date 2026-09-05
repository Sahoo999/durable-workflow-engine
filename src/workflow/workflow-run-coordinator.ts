import {
  getWorkflowRunTasks,
  getWorkflowRunById,
  updateWorkflowRunStatus,
} from "../db/repositories/workflow-repository.js";

import {
  determineWorkflowRunStatus,
} from "./workflow-run-status.js";

import {
  getTasksByWorkflowRunId,
} from "../db/repositories/task-repository.js";

export const synchronizeWorkflowRunStatus = async (
  workflowRunId: string,
  runId: string,
): Promise<void> => {

  // 1. Synchronize the WORKFLOW RUN status
  
  const workflowRunTasks =
    await getWorkflowRunTasks(workflowRunId);

  const workflowRunStatus =
    determineWorkflowRunStatus(
      workflowRunTasks.map((task) => task.status),
    );

  await updateWorkflowRunStatus(
    workflowRunId,
    workflowRunStatus,
  );

  
  // 2. Synchronize the individual RUN status
  
  const run = await getWorkflowRunById(runId);

  if (!run) {
    return;
  }

  const runTasks =
    await getTasksByWorkflowRunId(runId);

  if (runTasks.length === 0) {
    return;
  }

  const hasFailed = runTasks.some(
    (task) => task.status === "FAILED",
  );

  const allCompleted = runTasks.every(
    (task) => task.status === "COMPLETED",
  );

  if (hasFailed) {
    await updateWorkflowRunStatus(
      runId,
      "FAILED",
    );

    return;
  }

  if (allCompleted) {
    await updateWorkflowRunStatus(
      runId,
      "COMPLETED",
    );
  }
};