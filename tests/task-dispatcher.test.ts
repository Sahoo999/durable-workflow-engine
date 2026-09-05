import {
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

import { taskQueue } from "../src/queue/task-queue.js";
import { dispatchTask } from "../src/queue/task-dispatcher.js";

describe("task dispatcher", () => {
  afterEach(async () => {
    await taskQueue.drain(true);
  });

  it("dispatches a task job", async () => {
    const taskId =
      "f9ebf1bc-d9bf-422b-9e63-343385dd19cf";

    const workflowRunId =
      "1f6b4eb1-004f-4e60-acc8-27132065c7c1";

    const job = await dispatchTask({
      taskId,
      workflowRunId,
      taskType: "hello",
    });

    expect(job.name).toBe(
      "execute-task",
    );

    expect(job.data.taskId).toBe(taskId);
    expect(
      job.data.workflowRunId,
    ).toBe(workflowRunId);

    expect(job.data.taskType).toBe(
      "hello",
    );

    expect(job.id).toBe(
      `${workflowRunId}-${taskId}`,
    );
  });

  it("uses the same job id for duplicate dispatches", async () => {
    const taskId =
      "f9ebf1bc-d9bf-422b-9e63-343385dd19cf";

    const workflowRunId =
      "1f6b4eb1-004f-4e60-acc8-27132065c7c1";

    const data = {
      taskId,
      workflowRunId,
      taskType: "hello",
    };

    const first =
      await dispatchTask(data);

    const second =
      await dispatchTask(data);

    expect(first.id).toBe(second.id);

    expect(first.id).toBe(
      `${workflowRunId}-${taskId}`,
    );
  });

  it("creates a different job id for a retry attempt", async () => {
    const taskId =
      "f9ebf1bc-d9bf-422b-9e63-343385dd19cf";

    const workflowRunId =
      "1f6b4eb1-004f-4e60-acc8-27132065c7c1";

    const first =
      await dispatchTask({
        taskId,
        workflowRunId,
        taskType: "hello",
      });

    const retry =
      await dispatchTask(
        {
          taskId,
          workflowRunId,
          taskType: "hello",
        },
        {
          attemptNumber: 2,
        },
      );

    expect(first.id).not.toBe(
      retry.id,
    );

    expect(retry.id).toBe(
      `${workflowRunId}-${taskId}-attempt-2`,
    );
  })
  
});