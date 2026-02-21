import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiWorksGateway } from "./ApiWorksGateway";

const ORIGINAL_FETCH = globalThis.fetch;

describe("ApiWorksGateway contract", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("returns array payload and appends cache-bust query", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([{ id: "work-1" }]), { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const gateway = new ApiWorksGateway();
    const result = await gateway.fetchWorks({
      dataUrl: "/data/works.generated.json",
      cacheBust: true,
    });

    const [calledUrl, calledOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("/data/works.generated.json?_=1700000000000");
    expect(calledOptions.cache).toBe("no-store");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
  });

  it("throws on non-200 HTTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 500 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiWorksGateway();

    await expect(
      gateway.fetchWorks({
        dataUrl: "/data/works.generated.json",
      })
    ).rejects.toThrow("Databron niet bereikbaar (500).");
  });

  it("throws on invalid payload shape", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ invalid: true }), { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiWorksGateway();

    await expect(
      gateway.fetchWorks({
        dataUrl: "/data/works.generated.json",
      })
    ).rejects.toThrow("Databron heeft geen geldige lijststructuur.");
  });

  it("throws a descriptive message on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Timeout"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiWorksGateway();

    await expect(
      gateway.fetchWorks({
        dataUrl: "/data/works.generated.json",
      })
    ).rejects.toThrow("Geen verbinding met de lokale app-server (Timeout).");
  });
});
