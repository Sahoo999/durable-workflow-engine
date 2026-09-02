import {
  failStaleTaskAttempt,
  getLatestAttempt,
} from "../db/repositories/task-attempt-repository.js";

import {
  getTaskById,
  updateTaskStatus,
} from "../db/repositories/task-repository.js";

import { dispatchTask } from "../queue/task-dispatcher.js";

import { findStaleAttempts } from "./stale-attempt-detector.js";

export const recoverStaleAttempts = async (
  staleTimeoutMs: number,
): Promise<number> => {
  const staleBefore = new Date(
    Date.now() - staleTimeoutMs,
  );

  const staleAttempts =
    await findStaleAttempts(staleBefore);

  let recoveredCount = 0;

  for (const staleAttempt of staleAttempts) {
    const task = await getTaskById(
      staleAttempt.taskId,
    );

    if (!task) {
      continue;
    }

    const latestAttempt = await getLatestAttempt(
      task.id,
    );

    /*
     * Only recover the latest attempt.
     * An older attempt may already have been superseded.
     */
    if (
      !latestAttempt ||
      latestAttempt.id !== staleAttempt.id
    ) {
      continue;
    }

    const recovered = await failStaleTaskAttempt(
      staleAttempt.id,
      staleBefore,
      {
        code: "STALE_ATTEMPT",
        message:
          "Task attempt exceeded the heartbeat timeout.",
        detectedAt: new Date().toISOString(),
      },
    );

    if (!recovered) {
      continue;
    }

    const retryAvailable =
      recovered.attemptNumber < task.maxAttempts;

    if (!retryAvailable) {
      await updateTaskStatus(
        task.id,
        "FAILED",
      );

      recoveredCount += 1;
      continue;
    }

    const nextAttemptNumber =
      recovered.attemptNumber + 1;

    await updateTaskStatus(
      task.id,
      "PENDING",
    );

    await dispatchTask(
      {
        taskId: task.id,
        workflowRunId: task.workflowRunId,
        taskType: task.taskType,
      },
      {
        attemptNumber: nextAttemptNumber,
      },
    );

    console.log("Recovered stale task attempt:", {
      taskId: task.id,
      staleAttemptNumber:
        recovered.attemptNumber,
      nextAttemptNumber,
    });

    recoveredCount += 1;
  }

  return recoveredCount;
};