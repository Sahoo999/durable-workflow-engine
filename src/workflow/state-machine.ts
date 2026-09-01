import type { WorkflowStatus } from "../types/workflow.js";

const allowedTransitions: Record<
  WorkflowStatus,
  readonly WorkflowStatus[]
> = {
  PENDING: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING: ["RUNNING", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export const canTransition = (
  from: WorkflowStatus,
  to: WorkflowStatus,
): boolean => {
  return allowedTransitions[from].includes(to);
};

export const transitionWorkflow = (
  current: WorkflowStatus,
  next: WorkflowStatus,
): WorkflowStatus => {
  if (!canTransition(current, next)) {
    throw new Error(
      `Invalid workflow transition: ${current} -> ${next}`,
    );
  }

  return next;
};