import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { dispatchReadyTasks } from "../src/workflow/workflow-orchestrator.js";

import * as taskRepository from "../src/db/repositories/task-repository.js";
import * as taskDispatcher from "../src/queue/task-dispatcher.js";

describe("workflow orchestrator", () => {
  it("dispatches tasks with completed dependencies", async () => {
    const dispatchMock = vi
      .spyOn(taskDispatcher, "dispatchTask")
      .mockResolvedValue({} as never);

    vi.spyOn(
      taskRepository,
      "getTasksByWorkflowRunId",
    ).mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        workflowRunId:
          "22222222-2222-2222-2222-222222222222",
        taskKey: "A",
        taskType: "hello",
        status: "COMPLETED",
        dependsOn: [],
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        workflowRunId:
          "22222222-2222-2222-2222-222222222222",
        taskKey: "B",
        taskType: "hello",
        status: "PENDING",
        dependsOn: ["A"],
      },
    ] as never);

    const count =
      await dispatchReadyTasks(
        "22222222-2222-2222-2222-222222222222",
      );

    expect(count).toBe(1);
    expect(dispatchMock).toHaveBeenCalledTimes(1);

    dispatchMock.mockRestore();
  });

  it("does not dispatch blocked tasks", async () => {
    const dispatchMock = vi
      .spyOn(taskDispatcher, "dispatchTask")
      .mockResolvedValue({} as never);

    vi.spyOn(
      taskRepository,
      "getTasksByWorkflowRunId",
    ).mockResolvedValue([
      {
        id: "11111111-1111-1111-1111-111111111111",
        workflowRunId:
          "22222222-2222-2222-2222-222222222222",
        taskKey: "A",
        taskType: "hello",
        status: "RUNNING",
        dependsOn: [],
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        workflowRunId:
          "22222222-2222-2222-2222-222222222222",
        taskKey: "B",
        taskType: "hello",
        status: "PENDING",
        dependsOn: ["A"],
      },
    ] as never);

    const count =
      await dispatchReadyTasks(
        "22222222-2222-2222-2222-222222222222",
      );

    expect(count).toBe(0);
    expect(dispatchMock).not.toHaveBeenCalled();

    dispatchMock.mockRestore();
  });
});