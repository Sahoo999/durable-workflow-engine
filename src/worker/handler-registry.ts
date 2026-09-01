import type { TaskHandler } from "./task-handler.js";

const handlers = new Map<string, TaskHandler>();

export const registerHandler = (
  taskType: string,
  handler: TaskHandler,
): void => {
  if (handlers.has(taskType)) {
    throw new Error(
      `Handler already registered for task type: ${taskType}`,
    );
  }

  handlers.set(taskType, handler);
};

export const getHandler = (
  taskType: string,
): TaskHandler => {
  const handler = handlers.get(taskType);

  if (!handler) {
    throw new Error(
      `No handler registered for task type: ${taskType}`,
    );
  }

  return handler;
};