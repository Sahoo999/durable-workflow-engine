import {
  getDeadLetterEntryByTaskId,
  deleteDeadLetterEntry,
} from "../db/repositories/dead-letter-repository.js";

import { getTaskById } from "../db/repositories/task-repository.js";
import { dispatchTask } from "../queue/task-dispatcher.js";

export const replayDeadLetterTask = async (
  taskId: string,
) => {
  const entry =
    await getDeadLetterEntryByTaskId(taskId);

  if (!entry) {
    throw new Error(
      `Dead-letter entry not found for task: ${taskId}`,
    );
  }

  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(
      `Task not found: ${taskId}`,
    );
  }

  await dispatchTask({
    taskId: task.id,
    workflowRunId: task.workflowRunId,
    taskType: task.taskType,
  });

  await deleteDeadLetterEntry(entry.id);

  return {
    taskId,
    status: "REPLAYED",
  };
};