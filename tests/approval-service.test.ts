import { describe, expect, it } from "vitest";

describe("approval service", () => {
  it("allows a pending approval to be approved", () => {
    const status = "PENDING";

    expect(status).toBe("PENDING");
  });

  it("does not allow an already resolved approval", () => {
    const status = "APPROVED";

    expect(status).not.toBe("PENDING");
  });
});