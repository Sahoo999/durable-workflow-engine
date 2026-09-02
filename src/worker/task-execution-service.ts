import { getTaskById } from "../db/repositories/task-repository.js";
import {
  completeTaskAttempt,
  createTaskAttempt,
  failTaskAttempt,
  getNextAttemptNumber,
} from "../db/repositories/task-attempt-repository.js";
import { updateTaskStatus } from "../db/repositories/task-repository.js";
import { getHandler } from "./handler-registry.js";
import type { WorkerRuntime } from "./worker-service.js";
import { transitionTask } from "../workflow/task-state-machine.js";
import { dispatchTask } from "../queue/task-dispatcher.js";
import {
  calculateBackoffMs,
  shouldRetry,
} from "../workflow/retry-policy.js";

export const executeTask = async (
  taskId: string,
  runtime: WorkerRuntime,
): Promise<unknown> => {
  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const currentStatus = task.status;

  const runningStatus = transitionTask(
    currentStatus as never,
    "RUNNING",
  );

  await updateTaskStatus(task.id, runningStatus);

  const attemptNumber =
    await getNextAttemptNumber(task.id);

  const attempt = await createTaskAttempt({
    taskId: task.id,
    attemptNumber,
    input: task.input,
    workerId: runtime.id,
    fencingToken: attemptNumber,
  });

  try {
    const handler = getHandler(task.taskType);

    const result = await handler({
      taskId: task.id,
      workflowRunId: task.workflowRunId,
      taskType: task.taskType,
    });

    await completeTaskAttempt(
      attempt.id,
      result,
    );

    await updateTaskStatus(
      task.id,
      transitionTask("RUNNING", "COMPLETED"),
    );

    return result;
  } catch (error) {
    await failTaskAttempt(attempt.id, error);

const retry = shouldRetry(
  attempt.attemptNumber,
  task.maxAttempts,
);

if (retry) {
  const nextAttemptNumber = attempt.attemptNumber + 1;
  const delayMs = calculateBackoffMs(attempt.attemptNumber);

  await updateTaskStatus(task.id, "PENDING");

  await dispatchTask(
    {
      taskId: task.id,
      workflowRunId: task.workflowRunId,
      taskType: task.taskType,
    },
    {
      delayMs,
      attemptNumber: nextAttemptNumber,
    },
  );

  console.log("Task scheduled for retry:", {
    taskId: task.id,
    attemptNumber: nextAttemptNumber,
    delayMs,
  });

  return {
  status: "RETRY_SCHEDULED",
  attemptNumber: nextAttemptNumber,
  delayMs,
};
}

await updateTaskStatus(task.id, "FAILED");

throw error;
  }
};