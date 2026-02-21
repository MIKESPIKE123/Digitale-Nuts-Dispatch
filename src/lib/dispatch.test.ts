import { describe, expect, it } from "vitest";
import { buildDispatchPlan } from "./dispatch";
import type { Inspector, WorkRecord } from "../types";

function createWork(overrides: Partial<WorkRecord> = {}): WorkRecord {
  return {
    id: "work-1",
    dossierId: "BONU2026-0001",
    bonuNummer: "BONU2026-0001",
    referentieId: "REF-1",
    gipodId: "19170001",
    werftype: "NUTSWERKEN",
    status: "VERGUND",
    startDate: "2026-02-16",
    endDate: "2026-02-16",
    postcode: "2018",
    district: "Antwerpen",
    straat: "Teststraat",
    huisnr: "1",
    nutsBedrijf: "Fluvius",
    durationDays: 1,
    location: { lat: 51.2052, lng: 4.4211 },
    locationSource: "exact",
    ...overrides,
  };
}

const inspectors: Inspector[] = [
  {
    id: "insp-a",
    initials: "AA",
    name: "Inspecteur A",
    color: "#0a9396",
    primaryPostcodes: ["2000"],
    backupPostcodes: [],
  },
  {
    id: "insp-b",
    initials: "BB",
    name: "Inspecteur B",
    color: "#005f73",
    primaryPostcodes: ["2018"],
    backupPostcodes: [],
  },
];

describe("buildDispatchPlan - continuity/sticky inspector", () => {
  it("houdt sticky continuiteit aan zolang de sticky toezichter in scope blijft", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [createWork()],
      inspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      stickyInspectorByWorkId: {
        "work-1": "insp-b",
      },
    });

    const assignedToA = plan.visitsByInspector["insp-a"] ?? [];
    const assignedToB = plan.visitsByInspector["insp-b"] ?? [];

    expect(assignedToA).toHaveLength(0);
    expect(assignedToB).toHaveLength(1);
    expect(assignedToB[0].work.id).toBe("work-1");
  });

  it("falls back to normal assignment when sticky inspector does not exist", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [createWork()],
      inspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      stickyInspectorByWorkId: {
        "work-1": "insp-z",
      },
    });

    const assignedToB = plan.visitsByInspector["insp-b"] ?? [];
    expect(assignedToB).toHaveLength(1);
    expect(assignedToB[0].work.id).toBe("work-1");
  });

  it("respecteert postcodeprioriteit ook als continuity naar andere wijk wijst", () => {
    const zoneInspectors: Inspector[] = [
      {
        id: "insp-2000",
        initials: "AA",
        name: "Inspecteur 2000",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
      {
        id: "insp-2020",
        initials: "BB",
        name: "Inspecteur 2020",
        color: "#005f73",
        primaryPostcodes: ["2020"],
        backupPostcodes: [],
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({
          id: "work-zone",
          postcode: "2000",
        }),
      ],
      inspectors: zoneInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      stickyInspectorByWorkId: {
        "work-zone": "insp-2020",
      },
    });

    expect(plan.visitsByInspector["insp-2000"]).toHaveLength(1);
    expect(plan.visitsByInspector["insp-2020"]).toHaveLength(0);
  });
});

describe("buildDispatchPlan - afwezigheid, backup en reserve", () => {
  it("zet eerst backup in en schakelt daarna reserve in bij hoge workload", () => {
    const loadWorks = Array.from({ length: 6 }, (_, index) =>
      createWork({
        id: `work-${index + 1}`,
        dossierId: `BONU2026-${index + 1}`,
        bonuNummer: `BONU2026-${index + 1}`,
        postcode: "2000",
      })
    );

    const fallbackInspectors: Inspector[] = [
      {
        id: "insp-a",
        initials: "AA",
        name: "Inspecteur A",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
      {
        id: "insp-b",
        initials: "BB",
        name: "Inspecteur B",
        color: "#005f73",
        primaryPostcodes: ["2060"],
        backupPostcodes: ["2000"],
      },
      {
        id: "insp-c",
        initials: "CC",
        name: "Inspecteur C",
        color: "#ee9b00",
        primaryPostcodes: ["2018"],
        backupPostcodes: [],
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: loadWorks,
      inspectors: fallbackInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      unavailableInspectorIds: ["insp-a"],
    });

    expect(plan.visitsByInspector["insp-a"]).toHaveLength(0);
    expect(plan.visitsByInspector["insp-b"]).toHaveLength(6);
    expect(plan.visitsByInspector["insp-c"]).toHaveLength(0);
    expect(plan.unassigned).toHaveLength(0);
  });

  it("laat dossiers ontoegewezen als alle toezichters afwezig zijn", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [createWork({ id: "work-absent" })],
      inspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      unavailableInspectorIds: inspectors.map((inspector) => inspector.id),
    });

    expect(plan.unassigned).toHaveLength(1);
    expect(plan.unassigned[0].work.id).toBe("work-absent");
  });

  it("houdt rekening met actieve inzettermijn van toezichters", () => {
    const datedInspectors: Inspector[] = [
      {
        id: "insp-active",
        initials: "AC",
        name: "Inspecteur Active",
        color: "#0a9396",
        primaryPostcodes: ["2018"],
        backupPostcodes: [],
        activeUntil: "2026-02-15",
      },
      {
        id: "insp-reserve",
        initials: "RS",
        name: "Inspecteur Reserve",
        color: "#005f73",
        primaryPostcodes: ["2000"],
        backupPostcodes: ["2018"],
        isReserve: true,
        activeFrom: "2026-02-16",
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [createWork({ id: "work-termijn" })],
      inspectors: datedInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
    });

    expect(plan.visitsByInspector["insp-active"]).toHaveLength(0);
    expect(plan.visitsByInspector["insp-reserve"]).toHaveLength(1);
  });

  it("past globale soft/hard limieten toe als variabele capaciteit", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({ id: "work-cap-1", postcode: "2018" }),
        createWork({ id: "work-cap-2", postcode: "2018" }),
        createWork({ id: "work-cap-3", postcode: "2018" }),
      ],
      inspectors: [inspectors[1]],
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      dispatchCapacity: {
        softDailyLimit: 1,
        hardDailyLimit: 2,
        standardVisitWeight: 1,
        complexVisitWeight: 1.5,
        inspectorOverrides: {},
      },
    });

    expect(plan.visitsByInspector["insp-b"]).toHaveLength(2);
    expect(plan.unassigned).toHaveLength(1);
    expect(plan.totals.overflowInspectors).toBe(1);
  });

  it("houdt rekening met vaste dagbelasting en ervaringsfactor per toezichter", () => {
    const capacityInspectors: Inspector[] = [
      {
        id: "insp-main",
        initials: "MA",
        name: "Inspecteur Main",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
      {
        id: "insp-reserve",
        initials: "RS",
        name: "Inspecteur Reserve",
        color: "#005f73",
        primaryPostcodes: ["2060"],
        backupPostcodes: ["2000"],
        isReserve: true,
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({ id: "work-load-1", postcode: "2000", gipodCategorie: "Categorie 1" }),
        createWork({ id: "work-load-2", postcode: "2000", gipodCategorie: "Categorie 1" }),
      ],
      inspectors: capacityInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      dispatchCapacity: {
        softDailyLimit: 2,
        hardDailyLimit: 3,
        standardVisitWeight: 1,
        complexVisitWeight: 1.5,
        inspectorOverrides: {
          "insp-main": {
            fixedDailyLoad: 2,
            experienceFactor: 0.8,
          },
          "insp-reserve": {
            experienceFactor: 1.2,
          },
        },
      },
    });

    expect(plan.visitsByInspector["insp-main"]).toHaveLength(0);
    expect(plan.visitsByInspector["insp-reserve"]).toHaveLength(2);
  });
});
