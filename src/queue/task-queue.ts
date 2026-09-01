import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";
import type { TaskJobData } from "../types/jobs.js";

export const taskQueue = new Queue<TaskJobData>("workflow-tasks", {
  connection: redisConnection,
});