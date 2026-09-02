import type { Job } from "bullmq";
import { taskQueue } from "./task-queue.js";
import type { TaskJobData } from "../types/jobs.js";
import {setTaskScheduledAt, updateTaskStatus } from "../db/repositories/task-repository.js";

export const dispatchTask = async (
  data: TaskJobData,
  options?: {
    delayMs?: number;
    attemptNumber?: number;
  },
): Promise<Job<TaskJobData>> => {
  const suffix = options?.attemptNumber
    ? `-attempt-${options.attemptNumber}`
    : "";

  const jobId = `${data.workflowRunId}-${data.taskId}${suffix}`;

  await updateTaskStatus(
    data.taskId,
    "QUEUED",
  );

  if (options?.delayMs && options.delayMs > 0) {
    const scheduledAt = new Date(
      Date.now() + options.delayMs,
    );

    await setTaskScheduledAt(
      data.taskId,
      scheduledAt,
    );
  }

  return taskQueue.add(
    "execute-task",
    data,
    {
      jobId,
      delay: options?.delayMs,
    },
  );
};