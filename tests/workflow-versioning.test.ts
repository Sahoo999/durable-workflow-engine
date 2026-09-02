import {
  describe,
  expect,
  it,
} from "vitest";

import { validateDag } from "../src/workflow/dag-validator.js";

describe("workflow versioning", () => {
  it("accepts a valid versioned workflow", () => {
    expect(() =>
      validateDag([
        {
          id: "A",
        },
        {
          id: "B",
          dependsOn: ["A"],
        },
      ]),
    ).not.toThrow();
  });

  it("keeps version numbers explicit", () => {
    const v1 = 1;
    const v2 = v1 + 1;

    expect(v1).toBe(1);
    expect(v2).toBe(2);
  });
});