import { env } from "../config/env.js";
import { recoverStaleAttempts } from "./recovery-service.js";

export interface RecoveryLoop {
  stop: () => void;
}

export const startRecoveryLoop = (
  intervalMs = 5000,
): RecoveryLoop => {
  const run = () => {
    void recoverStaleAttempts(
      env.workerStaleTimeoutMs,
    ).catch((error) => {
      console.error(
        "Recovery scan failed:",
        error,
      );
    });
  };

  run();

  const interval = setInterval(
    run,
    intervalMs,
  );

  return {
    stop: () => {
      clearInterval(interval);
    },
  };
};