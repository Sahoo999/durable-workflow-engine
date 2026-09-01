import { Worker, type Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import type { TaskJobData } from "../types/jobs.js";
import { getHandler } from "./handler-registry.js";
import "./handlers.js";

const worker = new Worker<TaskJobData>(
  "workflow-tasks",
  async (job: Job<TaskJobData>) => {
    console.log("Received job:", job.id);

    const handler = getHandler(job.data.taskType);

    const result = await handler(job.data);

    console.log("Job completed:", job.id);

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

worker.on("completed", (job, result) => {
  console.log("Worker completed job:", job.id);
  console.log("Result:", result);
});

worker.on("failed", (job, error) => {
  console.error(
    "Worker failed job:",
    job?.id,
    error,
  );
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`Received ${signal}. Shutting down worker...`);

  await worker.close();
  await redisConnection.quit();

  process.exit(0);
};

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

console.log("Workflow worker started.");