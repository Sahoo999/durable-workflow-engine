import os from "node:os";
import { randomUUID } from "node:crypto";

export const createWorkerIdentity = () => {
  return {
    workerKey: `worker-${randomUUID()}`,
    hostname: os.hostname(),
  };
};