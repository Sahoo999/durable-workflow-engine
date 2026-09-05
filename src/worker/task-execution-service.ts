import {
  completeTaskIfRunning,
  getTaskById,
  updateTaskStatus,
  clearTaskScheduledAt,
} from "../db/repositories/task-repository.js";

import { dispatchReadyTasks } from "../workflow/workflow-orchestrator.js";

import {
  completeTaskAttempt,
  createTaskAttempt,
  failTaskAttempt,
  getNextAttemptNumber,
} from "../db/repositories/task-attempt-repository.js";

import {
  synchronizeWorkflowRunStatus,
} from "../workflow/workflow-run-coordinator.js";

import {
  addToDeadLetterQueue,
} from "../db/repositories/dead-letter-repository.js";

import { getHandler } from "./handler-registry.js";

import { startTaskHeartbeat } from "./task-heartbeat.js";

import type { WorkerRuntime } from "./worker-service.js";

import {
  isTaskStatus,
  type TaskStatus,
} from "../types/task.js";

import { transitionTask } from "../workflow/task-state-machine.js";

import { dispatchTask } from "../queue/task-dispatcher.js";

import {
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";

import {
  taskExecutionsTotal,
  taskFailuresTotal,
  taskRetriesTotal,
  taskDurationSeconds,
} from "../observability/metrics.js";

import {
  calculateBackoffMs,
  shouldRetry,
} from "../workflow/retry-policy.js";

const tracer = trace.getTracer(
  "durable-workflow-engine",
);

export const executeTask = async (
  taskId: string,
  runtime: WorkerRuntime,
): Promise<unknown> => {
  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(
      `Task not found: ${taskId}`,
    );
  }

  /*
   * Database values are runtime values, so validate
   * the status before passing it into the type-safe
   * state machine.
   */
  if (!isTaskStatus(task.status)) {
    throw new Error(
      `Invalid task status in database: ${task.status}`,
    );
  }

  await clearTaskScheduledAt(task.id);

  const currentStatus: TaskStatus =
    task.status;

  const runningStatus = transitionTask(
    currentStatus,
    "RUNNING",
  );

  await updateTaskStatus(
    task.id,
    runningStatus,
  );

  const attemptNumber =
    await getNextAttemptNumber(task.id);

  const span = tracer.startSpan(
    "workflow.task.execute",
  );

  span.setAttribute(
    "task.id",
    task.id,
  );

  span.setAttribute(
    "workflow.run.id",
    task.workflowRunId,
  );

  span.setAttribute(
    "task.type",
    task.taskType,
  );

  span.setAttribute(
    "task.attempt",
    attemptNumber,
  );

  span.setAttribute(
    "worker.id",
    runtime.id,
  );

  const startedAt =
    process.hrtime.bigint();

  const attempt =
    await createTaskAttempt({
      taskId: task.id,
      attemptNumber,
      input: task.input,
      workerId: runtime.id,
      fencingToken: attemptNumber,
    });

  const heartbeat =
    startTaskHeartbeat(attempt.id);

  try {
    const handler =
      getHandler(task.taskType);

    const result = await handler({
      taskId: task.id,
      workflowRunId:
        task.workflowRunId,
      taskType: task.taskType,
    });

    await completeTaskAttempt(
      attempt.id,
      attempt.fencingToken,
      result,
    );

    await completeTaskIfRunning(
      task.id,
    );

    /*
     * A successful task may unlock dependent
     * tasks, so dispatch anything that has
     * now become ready.
     */
    await dispatchReadyTasks(
      task.workflowRunId,
    );

    /*
     * Recalculate the workflow run state after
     * the task reaches its terminal state.
     */
    await synchronizeWorkflowRunStatus(
  task.workflowRunId,
  task.workflowRunId,
);

    span.setStatus({
      code: SpanStatusCode.OK,
    });

    return result;
  } catch (error) {
    taskFailuresTotal.inc();

    span.recordException(
      error instanceof Error
        ? error
        : String(error),
    );

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message:
        error instanceof Error
          ? error.message
          : String(error),
    });

    await failTaskAttempt(
      attempt.id,
      attempt.fencingToken,
      error,
    );

    const retry = shouldRetry(
      attempt.attemptNumber,
      task.maxAttempts,
    );

    if (retry) {
      const nextAttemptNumber =
        attempt.attemptNumber + 1;

      const delayMs =
        calculateBackoffMs(
          attempt.attemptNumber,
        );

      await updateTaskStatus(
        task.id,
        "PENDING",
      );

      await dispatchTask(
        {
          taskId: task.id,
          workflowRunId:
            task.workflowRunId,
          taskType: task.taskType,
        },
        {
          delayMs,
          attemptNumber:
            nextAttemptNumber,
        },
      );

      taskRetriesTotal.inc();

      console.log(
        "Task scheduled for retry:",
        {
          taskId: task.id,
          attemptNumber:
            nextAttemptNumber,
          delayMs,
        },
      );

      return {
        status: "RETRY_SCHEDULED",
        attemptNumber:
          nextAttemptNumber,
        delayMs,
      };
    }

    /*
     * No retries remain:
     * task becomes permanently failed.
     */
    await updateTaskStatus(
      task.id,
      "FAILED",
    );

    await addToDeadLetterQueue({
      taskId: task.id,
      reason: {
        code: "MAX_ATTEMPTS_EXCEEDED",
        message:
          error instanceof Error
            ? error.message
            : String(error),
        attemptNumber:
          attempt.attemptNumber,
        maxAttempts:
          task.maxAttempts,
      },
    });

    /*
     * The task is now terminal, so reconcile
     * the workflow run as well.
     */
    await synchronizeWorkflowRunStatus(
      task.workflowRunId,
      task.workflowRunId,
    );

    throw error;
  } finally {
    const durationSeconds =
      Number(
        process.hrtime.bigint() -
          startedAt,
      ) / 1_000_000_000;

    taskExecutionsTotal.inc();

    taskDurationSeconds.observe(
      durationSeconds,
    );

    span.setAttribute(
      "task.duration.seconds",
      durationSeconds,
    );

    heartbeat.stop();

    span.end();
  }
};