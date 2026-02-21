import { describe, expect, it } from "vitest";
import type { DNVaststellingRecord, DNVaststellingSyncItem } from "./contracts";
import { enqueueInspectionSync } from "./sync";

function createRecord(id: string): DNVaststellingRecord {
  return {
    id,
    createdAt: "2026-02-15T12:00:00.000Z",
    updatedAt: "2026-02-15T12:00:00.000Z",
    completionState: "queued",
    inspectorSession: {
      inspectorId: "I1",
      inspectorName: "Toezichter AB",
      inspectorInitials: "AB",
      deviceId: "device-1",
      startedAt: "2026-02-15T12:00:00.000Z",
    },
    immutableContext: {
      workId: "work-1",
      dossierId: "dossier-1",
      bonuNummer: "BONU2026-00001",
      referentieId: "ref-1",
      gipodId: "19170001",
      straat: "Teststraat",
      huisnr: "1",
      postcode: "2000",
      district: "Antwerpen",
      nutsBedrijf: "Fluvius",
      locationSource: "exact",
      latitude: 51.2,
      longitude: 4.4,
      plannedVisitDate: "2026-02-16",
      visitType: "START",
      assignedInspectorId: "I1",
      assignedInspectorName: "Toezichter AB",
    },
    mutablePayload: {
      metaLocation: "Teststraat 1",
      formData: {},
    },
    immutableFingerprint: "fingerprint",
  };
}

describe("enqueueInspectionSync", () => {
  it("adds a new queued item for a record", () => {
    const queued = enqueueInspectionSync([], createRecord("rec-1"));
    expect(queued).toHaveLength(1);
    expect(queued[0].type).toBe("inspection_saved");
    expect(queued[0].status).toBe("queued");
    expect(queued[0].payload.inspectionId).toBe("rec-1");
    expect(typeof queued[0].payload.idempotencyKey).toBe("string");
    expect(queued[0].payload.idempotencyKey).toContain("dn-sync-rec-1");
  });

  it("deduplicates pending queue entries by inspection id", () => {
    const existing: DNVaststellingSyncItem[] = [
      {
        id: "q1",
        type: "inspection_saved",
        status: "queued",
        createdAt: "2026-02-15T12:00:00.000Z",
        attempts: 0,
        payload: {
          inspectionId: "rec-1",
        },
      },
    ];

    const queued = enqueueInspectionSync(existing, createRecord("rec-1"));
    expect(queued).toHaveLength(1);
    expect(queued[0].id).toBe("q1");
  });
});
