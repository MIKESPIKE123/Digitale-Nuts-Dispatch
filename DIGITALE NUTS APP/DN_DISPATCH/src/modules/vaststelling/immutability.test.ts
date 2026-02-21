import { describe, expect, it } from "vitest";
import type { DNVaststellingRecord } from "./contracts";
import { updateDNVaststellingMutablePayload } from "./immutability";

const baseRecord: DNVaststellingRecord = {
  id: "dnv-1",
  createdAt: "2026-02-15T12:00:00.000Z",
  updatedAt: "2026-02-15T12:00:00.000Z",
  completionState: "draft",
  inspectorSession: {
    inspectorId: "I1",
    inspectorName: "Toezichter AB",
    inspectorInitials: "AB",
    deviceId: "dev-1",
    startedAt: "2026-02-15T12:00:00.000Z",
  },
  immutableContext: {
    workId: "work-1",
    dossierId: "BONU2026-0001",
    bonuNummer: "BONU2026-0001",
    referentieId: "REF-1",
    gipodId: "19170001",
    straat: "Teststraat",
    huisnr: "1",
    postcode: "2018",
    district: "Antwerpen",
    nutsBedrijf: "Fluvius",
    locationSource: "exact",
    latitude: 51.2052,
    longitude: 4.4211,
    plannedVisitDate: "2026-02-16",
    visitType: "START",
    assignedInspectorId: "I1",
    assignedInspectorName: "Toezichter AB",
  },
  mutablePayload: {},
  immutableFingerprint: "fingerprint-1",
};

describe("updateDNVaststellingMutablePayload", () => {
  it("updates mutable payload without changing immutable context", () => {
    const next = updateDNVaststellingMutablePayload(baseRecord, {
      notes: "Terreinnota",
      nokCount: 2,
    });

    expect(next.mutablePayload.notes).toBe("Terreinnota");
    expect(next.mutablePayload.nokCount).toBe(2);
    expect(next.immutableContext).toEqual(baseRecord.immutableContext);
    expect(next.updatedAt).not.toBe(baseRecord.updatedAt);
  });
});
