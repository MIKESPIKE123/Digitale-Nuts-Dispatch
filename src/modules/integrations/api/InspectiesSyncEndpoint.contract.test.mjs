import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { processInspectionSyncCommand } from "../../../../scripts/inspecties-sync-endpoint.mjs";

const tempDirs = [];

function buildCommand(overrides = {}) {
  return {
    itemId: "sync-item-1",
    itemType: "inspection_saved",
    inspectionId: "rec-1",
    idempotencyKey: "dn-sync-rec-1-2026-02-18T10_00_00.000Z-inspection_saved",
    mutationVersion: "2026-02-18T10:00:00.000Z",
    createdAt: "2026-02-18T10:00:00.000Z",
    payload: {
      inspectionId: "rec-1",
      idempotencyKey: "dn-sync-rec-1-2026-02-18T10_00_00.000Z-inspection_saved",
      record: {
        completionState: "queued",
        mutablePayload: {
          formData: {
            fase: "tijdelijk_herstel",
            status: "in_behandeling",
          },
        },
      },
    },
    deviceId: "device-1",
    attempts: 1,
    ...overrides,
  };
}

async function createTempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "dn-sync-endpoint-"));
  tempDirs.push(root);
  return root;
}

describe("Inspecties sync endpoint contract", () => {
  afterEach(async () => {
    for (const tempDir of tempDirs.splice(0, tempDirs.length)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it("accepts first mutation and persists idempotency entry", async () => {
    const rootDir = await createTempRoot();
    const command = buildCommand();

    const result = await processInspectionSyncCommand(command, {
      rootDir,
      headerIdempotencyKey: String(command.idempotencyKey),
    });

    expect(result.statusCode).toBe(201);
    expect(result.body).toMatchObject({
      outcome: "accepted",
      inspectionId: "rec-1",
      idempotencyKey: command.idempotencyKey,
      mappedStatus: "temporary_restore",
      statusMappingSource: "formData.fase=tijdelijk_herstel",
    });

    const storePath = path.join(rootDir, "DATA", "dn_sync_idempotency_store_v1.json");
    const rawStore = await fs.readFile(storePath, "utf8");
    const parsedStore = JSON.parse(rawStore);
    expect(parsedStore.entriesByKey[String(command.idempotencyKey)].inspectionId).toBe("rec-1");
  });

  it("returns duplicate on second call with same idempotency key", async () => {
    const rootDir = await createTempRoot();
    const command = buildCommand();

    const first = await processInspectionSyncCommand(command, {
      rootDir,
      headerIdempotencyKey: String(command.idempotencyKey),
    });
    const second = await processInspectionSyncCommand(command, {
      rootDir,
      headerIdempotencyKey: String(command.idempotencyKey),
    });

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(208);
    expect(second.body).toMatchObject({
      outcome: "duplicate",
      inspectionId: "rec-1",
      idempotencyKey: command.idempotencyKey,
    });
  });

  it("rejects when header and body idempotency key mismatch", async () => {
    const rootDir = await createTempRoot();
    const command = buildCommand();

    const result = await processInspectionSyncCommand(command, {
      rootDir,
      headerIdempotencyKey: "mismatch-key",
    });

    expect(result.statusCode).toBe(422);
    expect(result.body).toMatchObject({
      outcome: "rejected",
      error: "VALIDATION_FAILED",
    });
  });
});
