import { describe, expect, it } from "vitest";
import {
  canTransition,
  transitionWorkflow,
} from "../src/workflow/state-machine.js";

describe("workflow state machine", () => {
  it("allows PENDING -> RUNNING", () => {
    expect(canTransition("PENDING", "RUNNING")).toBe(true);
  });

  it("allows RUNNING -> COMPLETED", () => {
    expect(canTransition("RUNNING", "COMPLETED")).toBe(true);
  });

  it("allows RUNNING -> WAITING", () => {
    expect(canTransition("RUNNING", "WAITING")).toBe(true);
  });

  it("allows WAITING -> RUNNING", () => {
    expect(canTransition("WAITING", "RUNNING")).toBe(true);
  });

  it("rejects COMPLETED -> RUNNING", () => {
    expect(canTransition("COMPLETED", "RUNNING")).toBe(false);
  });

  it("rejects PENDING -> COMPLETED", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });

  it("throws for invalid transitions", () => {
    expect(() =>
      transitionWorkflow("COMPLETED", "RUNNING"),
    ).toThrow("Invalid workflow transition");
  });
});