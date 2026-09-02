import { dispatchTask } from "./task-dispatcher.js";
import { getTaskById } from "../db/repositories/task-repository.js";
import { taskQueue } from "./task-queue.js";

const main = async (): Promise<void> => {
  const taskId = process.argv[2];

  if (!taskId) {
    throw new Error(
      "Usage: npx tsx src/queue/dispatch-test-task.ts <taskId>",
    );
  }

  const task = await getTaskById(taskId);

  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const job = await dispatchTask({
    taskId: task.id,
    workflowRunId: task.workflowRunId,
    taskType: task.taskType,
  });

  console.log("Task dispatched.");
  console.log({
    jobId: job.id,
    taskId: task.id,
    workflowRunId: task.workflowRunId,
    taskType: task.taskType,
  });

  await taskQueue.close();
};

main().catch((error) => {
  console.error("Dispatch failed:", error);
  process.exitCode = 1;
});