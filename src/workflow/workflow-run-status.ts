export type WorkflowRunStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export const determineWorkflowRunStatus = (
  taskStatuses: string[],
): WorkflowRunStatus => {
  if (taskStatuses.length === 0) {
    return "COMPLETED";
  }

  if (taskStatuses.some(
    (status) => status === "FAILED",
  )) {
    return "FAILED";
  }

  if (
    taskStatuses.every(
      (status) => status === "COMPLETED",
    )
  ) {
    return "COMPLETED";
  }

  return "RUNNING";
};