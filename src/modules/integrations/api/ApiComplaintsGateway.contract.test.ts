import { describe, expect, it } from "vitest";
import { ApiComplaintsGateway } from "./ApiComplaintsGateway";

describe("ApiComplaintsGateway contract", () => {
  it("returns the expected complaint summary shape", async () => {
    const gateway = new ApiComplaintsGateway();
    const summary = await gateway.getComplaintSummary("work-42");

    expect(summary).toEqual({
      workId: "work-42",
      openCount: 0,
      closedCount: 0,
      lastUpdatedAt: null,
    });
  });
});
