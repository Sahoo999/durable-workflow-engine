import { describe, expect, it } from "vitest";
import { areDependenciesComplete } from "../src/workflow/task-readiness.js";

describe("task readiness", () => {
  it("allows a task when all dependencies are completed", () => {
    expect(
      areDependenciesComplete(
        ["A", "B"],
        [
          { taskKey: "A", status: "COMPLETED" },
          { taskKey: "B", status: "COMPLETED" },
        ],
      ),
    ).toBe(true);
  });

  it("blocks a task when a dependency is incomplete", () => {
    expect(
      areDependenciesComplete(
        ["A", "B"],
        [
          { taskKey: "A", status: "COMPLETED" },
          { taskKey: "B", status: "RUNNING" },
        ],
      ),
    ).toBe(false);
  });

  it("allows a task with no dependencies", () => {
    expect(
      areDependenciesComplete([], []),
    ).toBe(true);
  });
});