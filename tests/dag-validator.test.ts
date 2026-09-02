import { describe, expect, it } from "vitest";
import { validateDag } from "../src/workflow/dag-validator.js";

describe("DAG validator", () => {
  it("accepts a valid dependency graph", () => {
    expect(() =>
      validateDag([
        { id: "A" },
        { id: "B", dependsOn: ["A"] },
        { id: "C", dependsOn: ["B"] },
      ]),
    ).not.toThrow();
  });

  it("rejects unknown dependencies", () => {
    expect(() =>
      validateDag([
        { id: "A", dependsOn: ["missing"] },
      ]),
    ).toThrow();
  });

  it("rejects dependency cycles", () => {
    expect(() =>
      validateDag([
        { id: "A", dependsOn: ["C"] },
        { id: "B", dependsOn: ["A"] },
        { id: "C", dependsOn: ["B"] },
      ]),
    ).toThrow();
  });
});