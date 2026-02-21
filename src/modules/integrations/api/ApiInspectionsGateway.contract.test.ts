import { afterEach, describe, expect, it, vi } from "vitest";
import type { InspectionSyncCommand } from "../contracts";
import { ApiInspectionsGateway } from "./ApiInspectionsGateway";

const ORIGINAL_FETCH = globalThis.fetch;

const BASE_COMMAND: InspectionSyncCommand = {
  endpoint: "/api/inspecties/sync",
  timeoutMs: 15000,
  itemId: "sync-item-1",
  itemType: "inspection_saved",
  inspectionId: "rec-1",
  idempotencyKey: "dn-sync-rec-1-2026-02-17T09_00_00.000Z-inspection_saved",
  mutationVersion: "2026-02-17T09:00:00.000Z",
  createdAt: "2026-02-17T09:00:00.000Z",
  payload: {
    inspectionId: "rec-1",
    workId: "work-1",
  },
  deviceId: "device-1",
  attempts: 2,
};

describe("ApiInspectionsGateway contract", () => {
  afterEach(() => {
    globalThis.fetch = ORIGINAL_FETCH;
    vi.restoreAllMocks();
  });

  it("posts expected body and returns success result", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiInspectionsGateway();
    const result = await gateway.syncInspection(BASE_COMMAND);

    expect(result).toMatchObject({
      ok: true,
      statusCode: 201,
      duplicate: false,
    });
    expect(result.ack).toBeUndefined();

    const [calledUrl, calledOptions] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("/api/inspecties/sync");
    expect(calledOptions.method).toBe("POST");
    expect(calledOptions.headers).toEqual({
      "Content-Type": "application/json",
      "X-Idempotency-Key": "dn-sync-rec-1-2026-02-17T09_00_00.000Z-inspection_saved",
    });
    expect(JSON.parse(String(calledOptions.body))).toEqual({
      itemId: "sync-item-1",
      itemType: "inspection_saved",
      inspectionId: "rec-1",
      idempotencyKey: "dn-sync-rec-1-2026-02-17T09_00_00.000Z-inspection_saved",
      mutationVersion: "2026-02-17T09:00:00.000Z",
      createdAt: "2026-02-17T09:00:00.000Z",
      payload: {
        inspectionId: "rec-1",
        workId: "work-1",
      },
      deviceId: "device-1",
      attempts: 2,
    });
  });

  it("returns HTTP failure mapping on server error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 500 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiInspectionsGateway();
    const result = await gateway.syncInspection(BASE_COMMAND);

    expect(result).toMatchObject({
      ok: false,
      statusCode: 500,
      error: "HTTP 500",
      duplicate: false,
    });
    expect(result.ack).toBeUndefined();
  });

  it("maps duplicate acknowledgement response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          outcome: "duplicate",
          inspectionId: "rec-1",
          idempotencyKey: BASE_COMMAND.idempotencyKey,
          syncEventId: "sync-event-1",
          processedAt: "2026-02-18T08:00:00.000Z",
          serverVersion: "dn-api-v1",
        }),
        {
          status: 208,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiInspectionsGateway();
    const result = await gateway.syncInspection(BASE_COMMAND);

    expect(result).toMatchObject({
      ok: true,
      statusCode: 208,
      duplicate: true,
      ack: {
        outcome: "duplicate",
        inspectionId: "rec-1",
        idempotencyKey: BASE_COMMAND.idempotencyKey,
        syncEventId: "sync-event-1",
      },
    });
  });

  it("maps JSON error body when available", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "VALIDATION_FAILED" }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiInspectionsGateway();
    const result = await gateway.syncInspection(BASE_COMMAND);

    expect(result).toMatchObject({
      ok: false,
      statusCode: 422,
      error: "VALIDATION_FAILED",
      duplicate: false,
    });
  });

  it("returns timeout/network mapping on rejected request", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("Timeout"));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const gateway = new ApiInspectionsGateway();
    const result = await gateway.syncInspection(BASE_COMMAND);

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe("Timeout");
  });
});
