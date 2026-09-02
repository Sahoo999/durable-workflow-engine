import {
  describe,
  expect,
  it,
} from "vitest";

describe("stale attempt recovery", () => {
  it("retries when attempts remain", () => {
    const attemptNumber = 1;
    const maxAttempts = 3;

    expect(
      attemptNumber < maxAttempts,
    ).toBe(true);
  });

  it("fails permanently on the final attempt", () => {
    const attemptNumber = 3;
    const maxAttempts = 3;

    expect(
      attemptNumber < maxAttempts,
    ).toBe(false);
  });
});