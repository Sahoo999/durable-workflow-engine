import {
  markWorkerOffline,
  registerWorker,
  updateWorkerHeartbeat,
} from "../db/repositories/worker-repository.js";
import { createWorkerIdentity } from "./worker-identity.js";

export interface WorkerRuntime {
  id: string;
  workerKey: string;
  heartbeatInterval: ReturnType<typeof setInterval>;
}

export const startWorkerLifecycle =
  async (): Promise<WorkerRuntime> => {
    const identity = createWorkerIdentity();

    const worker = await registerWorker(identity);

    console.log("Worker registered.");
    console.log({
      id: worker.id,
      workerKey: worker.workerKey,
      hostname: worker.hostname,
    });

    const heartbeatInterval = setInterval(() => {
      void updateWorkerHeartbeat(worker.id).catch(
        (error) => {
          console.error(
            "Worker heartbeat failed:",
            error,
          );
        },
      );
    }, 5000);

    return {
      id: worker.id,
      workerKey: worker.workerKey,
      heartbeatInterval,
    };
  };

export const stopWorkerLifecycle = async (
  runtime: WorkerRuntime,
): Promise<void> => {
  clearInterval(runtime.heartbeatInterval);

  await markWorkerOffline(runtime.id);

  console.log(
    "Worker marked offline:",
    runtime.workerKey,
  );
};