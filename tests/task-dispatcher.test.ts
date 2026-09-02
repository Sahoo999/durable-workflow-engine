import { afterEach, describe, expect, it } from "vitest";
import { taskQueue } from "../src/queue/task-queue.js";
import { dispatchTask } from "../src/queue/task-dispatcher.js";

describe("task dispatcher", () => {
  afterEach(async () => {
    await taskQueue.drain(true);
  });

  it("dispatches a task job", async () => {
    const taskId = "11111111-1111-1111-1111-111111111111";
    const workflowRunId = "22222222-2222-2222-2222-222222222222";

    const job = await dispatchTask({
      taskId,
      workflowRunId,
      taskType: "hello",
    });

    expect(job.name).toBe("execute-task");
    expect(job.data.taskId).toBe(taskId);
    expect(job.data.workflowRunId).toBe(workflowRunId);
    expect(job.data.taskType).toBe("hello");

    expect(job.id).toBe(
      `${workflowRunId}-${taskId}`,
    );
  });
});