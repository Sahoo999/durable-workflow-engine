import { describe, expect, it } from "vitest";
import {
  getHandler,
  registerHandler,
} from "../src/worker/handler-registry.js";

describe("handler registry", () => {
  it("registers and retrieves a handler", async () => {
    const handler = async () => ({
      ok: true,
    });

    registerHandler("test-handler", handler);

    const resolved = getHandler("test-handler");

    await expect(
      resolved({
        taskId: "task-test-1",
        workflowRunId: "run-test-1",
        attemptId: "attempt-test-1",
        taskType: "test-handler",
      }),
    ).resolves.toEqual({
      ok: true,
    });
  });

  it("throws for unknown task types", () => {
    expect(() =>
      getHandler("missing-handler"),
    ).toThrow(
      "No handler registered for task type: missing-handler",
    );
  });

  it("rejects duplicate registrations", () => {
    registerHandler(
      "duplicate-handler",
      async () => null,
    );

    expect(() =>
      registerHandler(
        "duplicate-handler",
        async () => null,
      ),
    ).toThrow(
      "Handler already registered for task type: duplicate-handler",
    );
  });
});