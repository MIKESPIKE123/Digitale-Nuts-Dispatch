import { describe, expect, it } from "vitest";
import { MockInspectionsGateway } from "./MockInspectionsGateway";

function buildCommand(itemId: string, forceSyncFail = false) {
  return {
    endpoint: "/api/inspecties/sync",
    timeoutMs: 15000,
    itemId,
    itemType: "inspection_saved",
    inspectionId: "rec-1",
    idempotencyKey: `idem-${itemId}`,
    mutationVersion: "2026-02-17T09:00:00.000Z",
    createdAt: "2026-02-17T09:00:00.000Z",
    payload: {
      inspectionId: "rec-1",
      forceSyncFail,
    },
    deviceId: "device-test",
    attempts: 1,
  };
}

describe("MockInspectionsGateway", () => {
  it("returns success for normal sync payload", async () => {
    const gateway = new MockInspectionsGateway();
    const result = await gateway.syncInspection(buildCommand("item-1"));

    expect(result.ok).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.ack?.outcome).toBe("accepted");
    expect(result.duplicate).toBe(false);
  });

  it("returns failure for forced fail payload", async () => {
    const gateway = new MockInspectionsGateway();
    const result = await gateway.syncInspection(buildCommand("item-2", true));

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.error).toBe("MOCK_SYNC_FAILURE");
    expect(result.ack?.outcome).toBe("rejected");
  });

  it("handles duplicate idempotency key as already processed", async () => {
    const gateway = new MockInspectionsGateway();
    const first = await gateway.syncInspection(buildCommand("item-3"));
    const second = await gateway.syncInspection(buildCommand("item-3"));

    expect(first.ok).toBe(true);
    expect(first.statusCode).toBe(200);
    expect(first.ack?.outcome).toBe("accepted");
    expect(second.ok).toBe(true);
    expect(second.statusCode).toBe(208);
    expect(second.ack?.outcome).toBe("duplicate");
    expect(second.duplicate).toBe(true);
  });
});
