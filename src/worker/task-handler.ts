import type { TaskJobData } from "../types/jobs.js";

export type TaskHandler = (
  job: TaskJobData,
) => Promise<unknown>;