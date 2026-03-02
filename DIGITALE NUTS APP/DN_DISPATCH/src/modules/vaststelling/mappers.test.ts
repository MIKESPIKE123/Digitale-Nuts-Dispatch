import { describe, expect, it } from "vitest";
import type { PlannedVisit } from "../../types";
import {
  buildFreeDNVaststellingContext,
  createDNVaststellingDraft,
  mapVisitToDNVaststellingContext,
} from "./mappers";

function createVisit(): PlannedVisit {
  return {
    id: "visit-1",
    work: {
      id: "work-1",
      dossierId: "BONU2026-0001",
      bonuNummer: "BONU2026-0001",
      referentieId: "REF-1",
      gipodId: "19170001",
      werftype: "NUTSWERKEN",
      status: "VERGUND",
      startDate: "2026-02-16",
      endDate: "2026-02-20",
      postcode: "2018",
      district: "Antwerpen",
      straat: "Teststraat",
      huisnr: "1",
      nutsBedrijf: "Fluvius",
      durationDays: 4,
      location: { lat: 51.2052, lng: 4.4211 },
      locationSource: "exact",
    },
    visitType: "START",
    mandatory: true,
    priority: 120,
    inspectorId: "I1",
    inspectorInitials: "AB",
    inspectorName: "Toezichter AB",
    inspectorColor: "#0a9396",
    score: 99,
  };
}

describe("DN Vaststelling mappers", () => {
  it("maps a visit to immutable DN Vaststelling context", () => {
    const context = mapVisitToDNVaststellingContext(createVisit(), "2026-02-16");
    expect(context.workId).toBe("work-1");
    expect(context.dossierId).toBe("BONU2026-0001");
    expect(context.bonuNummer).toBe("BONU2026-0001");
    expect(context.assignedInspectorId).toBe("I1");
    expect(context.assignedInspectorName).toBe("Toezichter AB");
    expect(context.plannedVisitDate).toBe("2026-02-16");
  });

  it("creates a draft with immutable fingerprint", () => {
    const context = mapVisitToDNVaststellingContext(createVisit(), "2026-02-16");
    const draft = createDNVaststellingDraft({
      session: {
        inspectorId: "I1",
        inspectorName: "Toezichter AB",
        inspectorInitials: "AB",
        deviceId: "dev-1",
        startedAt: "2026-02-15T12:00:00.000Z",
      },
      context,
    });

    expect(draft.completionState).toBe("draft");
    expect(draft.immutableFingerprint.length).toBeGreaterThan(10);
    expect(draft.immutableContext.workId).toBe("work-1");
  });

  it("builds a free GPS context for field observations", () => {
    const context = buildFreeDNVaststellingContext({
      latitude: 51.219447,
      longitude: 4.402464,
      dispatchDate: "2026-03-01",
      session: {
        inspectorId: "I1",
        inspectorName: "Toezichter AB",
        inspectorInitials: "AB",
        deviceId: "ipad-001",
        startedAt: "2026-03-01T08:30:00.000Z",
      },
    });

    expect(context.workId.startsWith("FREE-")).toBe(true);
    expect(context.dossierId.startsWith("FREE-")).toBe(true);
    expect(context.locationSource).toBe("exact");
    expect(context.visitType).toBe("TUSSEN");
    expect(context.latitude).toBe(51.219447);
    expect(context.longitude).toBe(4.402464);
    expect(context.assignedInspectorId).toBe("I1");
  });
});
