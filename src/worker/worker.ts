import { Worker, type Job } from "bullmq";
import { startRecoveryLoop } from "./recovery-loop.js";
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

  const recoveryLoop = startRecoveryLoop();

  const worker = new Worker<TaskJobData>(
  "workflow-tasks",
  async (job) => {
    console.log("Received task:", job.data);

    const result = await executeTask(job.data.taskId, runtime);

    console.log("Task execution finished:", result);

    return result;
  },
  {
    connection: redisConnection,
    concurrency: 1,
  },
);

  worker.on("completed", (job, result) => {
    console.log("Worker completed queue job:", job.id);
console.log("Execution result:", result);
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
        recoveryLoop.stop();
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

main().catch((error) => {
  console.error("Worker startup failed:", error);
  process.exitCode = 1;
});