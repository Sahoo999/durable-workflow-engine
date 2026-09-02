import {
  getTasksByWorkflowRunId,
} from "../db/repositories/task-repository.js";

import {
  areDependenciesComplete,
} from "./task-readiness.js";

import { dispatchTask } from "../queue/task-dispatcher.js";

export const dispatchReadyTasks = async (
  workflowRunId: string,
): Promise<number> => {
  const tasks =
    await getTasksByWorkflowRunId(
      workflowRunId,
    );

  let dispatchedCount = 0;

  for (const task of tasks) {
    /*
     * Only PENDING tasks are eligible for dispatch.
     */
    if (task.status !== "PENDING") {
      continue;
    }

    const dependencies =
      task.dependsOn ?? [];

    const ready =
      areDependenciesComplete(
        dependencies,
        tasks.map((candidate) => ({
          taskKey: candidate.taskKey,
          status: candidate.status,
        })),
      );

    if (!ready) {
      continue;
    }

    await dispatchTask({
      taskId: task.id,
      workflowRunId: task.workflowRunId,
      taskType: task.taskType,
    });

    dispatchedCount += 1;
  }

  return dispatchedCount;
};