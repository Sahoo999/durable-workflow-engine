export const TASK_STATUSES = [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];