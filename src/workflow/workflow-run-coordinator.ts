import {
  getWorkflowRunTasks,
  updateWorkflowRunStatus,
} from "../db/repositories/workflow-repository.js";

import {
  determineWorkflowRunStatus,
} from "./workflow-run-status.js";

export const synchronizeWorkflowRunStatus =
  async (
    workflowRunId: string,
  ): Promise<void> => {
    const tasks =
      await getWorkflowRunTasks(
        workflowRunId,
      );

    const status =
      determineWorkflowRunStatus(
        tasks.map((task) => task.status),
      );

    await updateWorkflowRunStatus(
      workflowRunId,
      status,
    );
  };