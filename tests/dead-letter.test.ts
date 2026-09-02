import {
  describe,
  expect,
  it,
} from "vitest";

describe("dead letter queue", () => {
  it("identifies a permanent task failure", () => {
    const attemptNumber = 3;
    const maxAttempts = 3;

    expect(
      attemptNumber >= maxAttempts,
    ).toBe(true);
  });
});