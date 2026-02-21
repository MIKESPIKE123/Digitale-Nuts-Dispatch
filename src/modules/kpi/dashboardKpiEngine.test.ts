import { describe, expect, it } from "vitest";
import type { DispatchPlan, Inspector, PlannedVisit, WorkRecord } from "../../types";
import { buildDashboardKpis } from "./dashboardKpiEngine";

function createWork(id: string, status: "VERGUND" | "IN EFFECT", endDate: string): WorkRecord {
  return {
    id,
    dossierId: `DOS-${id}`,
    bonuNummer: `BONU-${id}`,
    referentieId: `REF-${id}`,
    gipodId: `19170${id}`,
    werftype: "NUTSWERKEN",
    status,
    startDate: "2026-02-15",
    endDate,
    postcode: "2000",
    district: "Antwerpen",
    straat: "Teststraat",
    huisnr: "1",
    nutsBedrijf: "Fluvius",
    durationDays: 5,
    location: { lat: 51.22, lng: 4.4 },
    locationSource: "exact",
  };
}

function createVisit(id: string, type: "START" | "EIND" | "TUSSEN", work: WorkRecord): PlannedVisit {
  return {
    id,
    work,
    visitType: type,
    mandatory: type !== "TUSSEN",
    priority: 100,
    inspectorId: "I1",
    inspectorInitials: "AB",
    inspectorName: "Inspecteur AB",
    inspectorColor: "#0a9396",
    score: 100,
  };
}

describe("buildDashboardKpis", () => {
  it("bouwt dashboard KPI-cards met stabiele keys", () => {
    const work1 = createWork("1", "IN EFFECT", "2026-02-22");
    const work2 = createWork("2", "VERGUND", "2026-02-24");
    const visits = [createVisit("v1", "START", work1), createVisit("v2", "TUSSEN", work2)];

    const inspectors: Inspector[] = [
      {
        id: "I1",
        initials: "AB",
        name: "Inspecteur AB",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
    ];

    const dispatch: DispatchPlan = {
      date: "2026-02-20",
      isWorkday: true,
      visitsByInspector: {
        I1: visits,
      },
      followUpsByInspector: {
        I1: [],
      },
      preferredInspectorByWorkId: {},
      unassigned: [],
      totals: {
        plannedVisits: 2,
        mandatoryVisits: 1,
        optionalVisits: 1,
        overflowInspectors: 0,
        followUps: 0,
      },
    };

    const cards = buildDashboardKpis({
      selectedDate: "2026-02-20",
      contextWorks: [work1, work2],
      mapVisits: visits,
      dispatch,
      inspectors,
      visibleInspectorIds: new Set(),
      filteredFollowUpCount: 0,
    });

    const keys = cards.map((card) => card.key);
    expect(cards).toHaveLength(16);
    expect(keys).toContain("start-visits");
    expect(keys).toContain("assignment-rate");
    expect(keys).toContain("top-district");
  });
});
