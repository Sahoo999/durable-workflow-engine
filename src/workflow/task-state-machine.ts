import type { TaskStatus } from "../types/task.js";

const allowedTaskTransitions: Record<
  TaskStatus,
  readonly TaskStatus[]
> = {
  PENDING: ["QUEUED", "CANCELLED"],
  QUEUED: ["RUNNING", "CANCELLED"],
  RUNNING: ["WAITING", "COMPLETED", "FAILED", "CANCELLED"],
  WAITING: ["RUNNING", "CANCELLED"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

export const canTransitionTask = (
  from: TaskStatus,
  to: TaskStatus,
): boolean => {
  return allowedTaskTransitions[from].includes(to);
};

export const transitionTask = (
  current: TaskStatus,
  next: TaskStatus,
): TaskStatus => {
  if (!canTransitionTask(current, next)) {
    throw new Error(
      `Invalid task transition: ${current} -> ${next}`,
    );
  }

  return next;
};