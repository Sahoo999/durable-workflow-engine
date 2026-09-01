import { getTaskById } from "./repositories/task-repository.js";
import { pool } from "./client.js";

const taskId = process.argv[2];

if (!taskId) {
  throw new Error(
    "Usage: npx tsx src/db/test-task-repository.ts <taskId>",
  );
}

const main = async (): Promise<void> => {
  try {
    const task = await getTaskById(taskId);

    if (!task) {
      console.log("Task not found.");
      return;
    }

    console.log("Task found:");
    console.log({
      id: task.id,
      taskKey: task.taskKey,
      taskType: task.taskType,
      status: task.status,
    });
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("Repository test failed:", error);
  process.exitCode = 1;
});