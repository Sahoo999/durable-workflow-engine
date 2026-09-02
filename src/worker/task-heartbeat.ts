import { updateTaskAttemptHeartbeat } from "../db/repositories/task-attempt-repository.js";

export interface TaskHeartbeatRuntime {
  stop: () => void;
}

export const startTaskHeartbeat = (
  attemptId: string,
  intervalMs = 5000,
): TaskHeartbeatRuntime => {
  const heartbeat = () => {
    void updateTaskAttemptHeartbeat(attemptId).catch((error) => {
      console.error("Task attempt heartbeat failed:", error);
    });
  };

  const interval = setInterval(heartbeat, intervalMs);

  return {
    stop: () => {
      clearInterval(interval);
    },
  };
};