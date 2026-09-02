export const TASK_STATUSES = [
  "PENDING",
  "QUEUED",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type TaskStatus =
  (typeof TASK_STATUSES)[number];

export const isTaskStatus = (
  value: string,
): value is TaskStatus => {
  return TASK_STATUSES.includes(
    value as TaskStatus,
  );
};