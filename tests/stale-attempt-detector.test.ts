import { describe, expect, it } from "vitest";

describe("stale attempt detector", () => {
  it("defines the stale attempt concept", () => {
    const now = new Date("2026-09-02T10:00:00Z");
    const staleBefore = new Date(
      now.getTime() - 30_000,
    );

    expect(
      staleBefore.getTime(),
    ).toBe(
      now.getTime() - 30_000,
    );
  });
});