import { afterEach, describe, expect, it } from "vitest";
import { taskQueue } from "../src/queue/task-queue.js";
import { dispatchTask } from "../src/queue/task-dispatcher.js";

describe("task dispatcher", () => {
  afterEach(async () => {
    await taskQueue.drain(true);
  });

  it("dispatches a task job", async () => {
    const job = await dispatchTask({
      taskId: "task-123",
      workflowRunId: "run-123",
      attemptId: "attempt-1",
      taskType: "hello",
    });

    expect(job.name).toBe("execute-task");
    expect(job.data.taskId).toBe("task-123");
    expect(job.data.workflowRunId).toBe("run-123");
    expect(job.data.attemptId).toBe("attempt-1");
    expect(job.data.taskType).toBe("hello");
    expect(job.id).toBe("task-123-attempt-1");
  });
});