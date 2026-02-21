import { describe, expect, it } from "vitest";
import { MockPermitsGateway } from "./MockPermitsGateway";

describe("MockPermitsGateway", () => {
  it("returns null for an empty permit reference", async () => {
    const gateway = new MockPermitsGateway();

    await expect(gateway.getPermitStatus("   ")).resolves.toBeNull();
  });

  it("returns a deterministic permit status contract", async () => {
    const gateway = new MockPermitsGateway();
    const first = await gateway.getPermitStatus(" PERMIT-2026-123 ");
    const second = await gateway.getPermitStatus("PERMIT-2026-123");

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    if (!first || !second) {
      throw new Error("Expected deterministic permit lookup for non-empty reference.");
    }

    expect(first.permitReference).toBe("PERMIT-2026-123");
    expect(first.source).toBe("mock");
    expect(first.status).toBe(second.status);
    expect(first.notes).toBe("Mock vergunningstatus voor pitch/demo.");
    expect(Number.isNaN(Date.parse(first.updatedAt))).toBe(false);
  });
});
