import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const taskQueue = new Queue("workflow-tasks", {
  connection: redisConnection,
});