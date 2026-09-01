import { registerHandler } from "./handler-registry.js";

registerHandler("hello", async (job) => {
  return {
    message: "Hello from the worker!",
    taskId: job.taskId,
  };
});

registerHandler("sleep", async (job) => {
  await new Promise((resolve) =>
    setTimeout(resolve, 3000),
  );

  return {
    message: "Sleep task completed",
    taskId: job.taskId,
  };
});