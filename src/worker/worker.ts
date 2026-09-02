import { Worker, type Job } from "bullmq";
import { redisConnection } from "../config/redis.js";
import type { TaskJobData } from "../types/jobs.js";
import { executeTask } from "./task-execution-service.js";
import "./handlers.js";
import {
  startWorkerLifecycle,
  stopWorkerLifecycle,
  type WorkerRuntime,
} from "./worker-service.js";

const main = async (): Promise<void> => {
  const runtime = await startWorkerLifecycle();

  const worker = new Worker<TaskJobData>(
  "workflow-tasks",
  async (job) => {
    console.log("Received task:", job.data);

    const result = await executeTask(job.data.taskId, runtime);

    console.log("Task completed:", result);

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

  console.log("Workflow worker started.");

  const shutdown = async (
    signal: string,
  ): Promise<void> => {
    console.log(
      `Received ${signal}. Shutting down worker...`,
    );

    try {
      await worker.close();
      await stopWorkerLifecycle(runtime);
      await redisConnection.quit();
    } catch (error) {
      console.error(
        "Worker shutdown failed:",
        error,
      );

      process.exitCode = 1;
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
};