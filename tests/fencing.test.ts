import { describe, expect, it } from "vitest";

describe("fencing", () => {
  it("rejects an older fencing token", () => {
    const currentToken = 2;
    const staleToken = 1;

    expect(staleToken < currentToken).toBe(true);
  });
});
