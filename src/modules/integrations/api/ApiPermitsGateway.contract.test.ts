import { describe, expect, it } from "vitest";
import { ApiPermitsGateway } from "./ApiPermitsGateway";

describe("ApiPermitsGateway contract", () => {
  it("returns null while external permit API is not connected", async () => {
    const gateway = new ApiPermitsGateway();
    const result = await gateway.getPermitStatus("PERMIT-2026-0001");

    expect(result).toBeNull();
  });
});
