import { describe, expect, it } from "vitest";
import { registerFirstAssignedInspectors } from "./inspectorContinuity";
import type { PlannedVisit } from "../types";

function createVisit(workId: string, inspectorId: string, inspectorInitials: string): PlannedVisit {
  return {
    id: `${workId}-${inspectorId}`,
    work: {
      id: workId,
      dossierId: `BONU-${workId}`,
      bonuNummer: `BONU-${workId}`,
      referentieId: "REF",
      gipodId: "19170001",
      werftype: "NUTSWERKEN",
      status: "VERGUND",
      startDate: "2026-02-16",
      endDate: "2026-02-16",
      postcode: "2000",
      district: "Antwerpen",
      straat: "Teststraat",
      huisnr: "1",
      nutsBedrijf: "Fluvius",
      durationDays: 1,
      location: { lat: 51.22, lng: 4.4 },
      locationSource: "exact",
    },
    visitType: "START",
    mandatory: true,
    priority: 120,
    inspectorId,
    inspectorInitials,
    inspectorName: `Inspecteur ${inspectorInitials}`,
    inspectorColor: "#0a9396",
    score: 100,
  };
}

describe("registerFirstAssignedInspectors", () => {
  it("adds new first assignments and keeps existing assignments unchanged", () => {
    const previous = { "work-1": "insp-a" };
    const visitsByInspector = {
      "insp-a": [createVisit("work-1", "insp-a", "AA")],
      "insp-b": [createVisit("work-2", "insp-b", "BB")],
    };

    const { nextMap, added } = registerFirstAssignedInspectors(
      previous,
      visitsByInspector,
      ["insp-a", "insp-b"]
    );

    expect(added).toBe(1);
    expect(nextMap["work-1"]).toBe("insp-a");
    expect(nextMap["work-2"]).toBe("insp-b");
  });
});
