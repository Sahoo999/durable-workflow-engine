import {
  describe,
  expect,
  it,
} from "vitest";

import {
  determineWorkflowRunStatus,
} from "../src/workflow/workflow-run-status.js";

describe("workflow run status", () => {
  it("is COMPLETED when every task completes", () => {
    expect(
      determineWorkflowRunStatus([
        "COMPLETED",
        "COMPLETED",
      ]),
    ).toBe("COMPLETED");
  });

  it("is FAILED when any task fails", () => {
    expect(
      determineWorkflowRunStatus([
        "COMPLETED",
        "FAILED",
      ]),
    ).toBe("FAILED");
  });

  it("is RUNNING when work remains", () => {
    expect(
      determineWorkflowRunStatus([
        "COMPLETED",
        "RUNNING",
      ]),
    ).toBe("RUNNING");
  });

  it("handles an empty task list", () => {
    expect(
      determineWorkflowRunStatus([]),
    ).toBe("COMPLETED");
  });
});