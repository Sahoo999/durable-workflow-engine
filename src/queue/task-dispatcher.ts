import type { Job } from "bullmq";
import { taskQueue } from "./task-queue.js";
import type { TaskJobData } from "../types/jobs.js";

export const dispatchTask = async (
  data: TaskJobData,
): Promise<Job<TaskJobData>> => {
  const jobId = `${data.taskId}-${data.attemptId}`;

  return taskQueue.add("execute-task", data, {
    jobId,
  });
};