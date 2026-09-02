import { describe, expect, it } from "vitest";
import {
  calculateBackoffMs,
  shouldRetry,
} from "../src/workflow/retry-policy.js";

describe("retry policy", () => {
  it("retries when attempts remain", () => {
    expect(shouldRetry(1, 3)).toBe(true);
    expect(shouldRetry(2, 3)).toBe(true);
  });

  it("does not retry after the final attempt", () => {
    expect(shouldRetry(3, 3)).toBe(false);
  });

  it("calculates exponential backoff", () => {
    expect(calculateBackoffMs(1)).toBe(1000);
    expect(calculateBackoffMs(2)).toBe(2000);
    expect(calculateBackoffMs(3)).toBe(4000);
  });
});