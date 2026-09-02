import { pool } from "./client.js";
import { createWorkerIdentity } from "../worker/worker-identity.js";
import { registerWorker } from "./repositories/worker-repository.js";
import {
  createTaskAttempt,
  getNextAttemptNumber,
} from "./repositories/task-attempt-repository.js";

const taskId = process.argv[2];

if (!taskId) {
  throw new Error(
    "Usage: npx tsx src/db/test-real-attempt.ts <taskId>",
  );
}

const main = async (): Promise<void> => {
  try {
    const identity = createWorkerIdentity();

    const worker = await registerWorker(identity);

    console.log("Worker registered:", {
      id: worker.id,
      workerKey: worker.workerKey,
    });

    const attemptNumber =
      await getNextAttemptNumber(taskId);

    const attempt = await createTaskAttempt({
      taskId,
      attemptNumber,
      input: {
        message: "real worker attempt",
      },
      workerId: worker.id,
      fencingToken: attemptNumber,
    });

    console.log("Attempt created:", {
      id: attempt.id,
      taskId: attempt.taskId,
      attemptNumber: attempt.attemptNumber,
      workerId: attempt.workerId,
      status: attempt.status,
      fencingToken: attempt.fencingToken,
    });
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  console.error("Test failed:", error);
  process.exitCode = 1;
});