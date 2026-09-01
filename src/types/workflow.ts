export const WORKFLOW_STATUSES = [
  "PENDING",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type WorkflowStatus =
  (typeof WORKFLOW_STATUSES)[number];