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
    permitStatus: "AFGELEVERD",
    permitReferenceId: "GW2026-TEST-REF",
    permitRefKey: "TEST-KEY",
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

  it("bouwt default preferred inspecteurs deterministisch op zonder beurtrol-effect", () => {
    const dualInspectors: Inspector[] = [
      {
        id: "insp-core",
        initials: "CR",
        name: "Inspecteur Core",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
      {
        id: "insp-wide",
        initials: "WD",
        name: "Inspecteur Wide",
        color: "#005f73",
        primaryPostcodes: ["2000", "2660"],
        backupPostcodes: [],
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({ id: "work-det-1", postcode: "2000" }),
        createWork({ id: "work-det-2", dossierId: "BONU2026-0002", bonuNummer: "BONU2026-0002", postcode: "2000" }),
      ],
      inspectors: dualInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
    });

    expect(plan.preferredInspectorByWorkId["work-det-1"]).toBe("insp-core");
    expect(plan.preferredInspectorByWorkId["work-det-2"]).toBe("insp-core");
  });

  it("respecteert manuele override ook buiten primaire postcodepool", () => {
    const manualPlan = buildDispatchPlan({
      date: "2026-02-16",
      works: [createWork({ id: "work-manual", postcode: "2000" })],
      inspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      manualInspectorByWorkId: {
        "work-manual": "insp-b",
      },
    });

    expect(manualPlan.visitsByInspector["insp-a"]).toHaveLength(0);
    expect(manualPlan.visitsByInspector["insp-b"]).toHaveLength(1);
    expect(manualPlan.visitsByInspector["insp-b"]?.[0].work.id).toBe("work-manual");
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

    expect(plan.visitsByInspector["insp-main"]).toHaveLength(1);
    expect(plan.visitsByInspector["insp-reserve"]).toHaveLength(1);
  });

  it("zet dedicated toezichter eerst vol tot limiet voor backup inzet", () => {
    const dedicatedInspectors: Inspector[] = [
      {
        id: "insp-main",
        initials: "MA",
        name: "Inspecteur Main",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
      {
        id: "insp-backup",
        initials: "BK",
        name: "Inspecteur Backup",
        color: "#005f73",
        primaryPostcodes: ["2018"],
        backupPostcodes: ["2000"],
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({ id: "work-ded-1", postcode: "2000" }),
        createWork({ id: "work-ded-2", postcode: "2000" }),
        createWork({ id: "work-ded-3", postcode: "2000" }),
        createWork({ id: "work-ded-4", postcode: "2000" }),
      ],
      inspectors: dedicatedInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      dispatchCapacity: {
        softDailyLimit: 1,
        hardDailyLimit: 4,
        standardVisitWeight: 1,
        complexVisitWeight: 1.5,
        inspectorOverrides: {
          "insp-main": {
            hardDailyLimit: 2,
          },
        },
      },
    });

    expect(plan.visitsByInspector["insp-main"]).toHaveLength(2);
    expect(plan.visitsByInspector["insp-backup"]).toHaveLength(2);
  });

  it("geeft binnen dezelfde pool voorrang aan lagere weeklast", () => {
    const balancedInspectors: Inspector[] = [
      {
        id: "insp-heavy",
        initials: "HV",
        name: "Inspecteur Heavy",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
      {
        id: "insp-light",
        initials: "LT",
        name: "Inspecteur Light",
        color: "#005f73",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
    ];

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [createWork({ id: "work-fair-1", postcode: "2000" })],
      inspectors: balancedInspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      weeklyAssignedVisitsByInspector: {
        "insp-heavy": 12,
        "insp-light": 0,
      },
      weeklyFairnessWeight: 50,
    });

    expect(plan.visitsByInspector["insp-heavy"]).toHaveLength(0);
    expect(plan.visitsByInspector["insp-light"]).toHaveLength(1);
  });

  it("laat categorie 3 vrij toe zolang capaciteit dit toelaat", () => {
    const capacityInspector: Inspector[] = [
      {
        id: "insp-cap",
        initials: "CP",
        name: "Inspecteur Capaciteit",
        color: "#0a9396",
        primaryPostcodes: ["2000"],
        backupPostcodes: [],
      },
    ];

    const largeWorks = Array.from({ length: 10 }, (_, index) =>
      createWork({
        id: `work-large-${index + 1}`,
        dossierId: `BONU2026-L${index + 1}`,
        bonuNummer: `BONU2026-L${index + 1}`,
        postcode: "2000",
        gipodCategorie: index % 2 === 0 ? "Categorie 1" : "Categorie 2",
      })
    );
    const category3Works = Array.from({ length: 4 }, (_, index) =>
      createWork({
        id: `work-cat3-${index + 1}`,
        dossierId: `BONU2026-C${index + 1}`,
        bonuNummer: `BONU2026-C${index + 1}`,
        postcode: "2000",
        gipodCategorie: "Categorie 3",
      })
    );

    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [...category3Works, ...largeWorks],
      inspectors: capacityInspector,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      dispatchCapacity: {
        softDailyLimit: 30,
        hardDailyLimit: 30,
        standardVisitWeight: 1,
        complexVisitWeight: 1,
        inspectorOverrides: {},
      },
    });

    const assigned = plan.visitsByInspector["insp-cap"] ?? [];
    const assignedCategory3 = assigned.filter(
      (visit) => (visit.work.gipodCategorie ?? "").trim() === "Categorie 3"
    ).length;

    expect(assigned).toHaveLength(14);
    expect(assignedCategory3).toBe(4);
    expect(
      plan.unassigned.filter((visit) => (visit.work.gipodCategorie ?? "").trim() === "Categorie 3")
    ).toHaveLength(0);
  });

  it("vult kandidaten aan tot 75% van actieve dossiers op datum", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-18",
      works: [
        createWork({
          id: "work-topup-start",
          dossierId: "BONU2026-TOPUP-1",
          bonuNummer: "BONU2026-TOPUP-1",
          postcode: "2018",
          startDate: "2026-02-18",
          endDate: "2026-02-20",
        }),
        createWork({
          id: "work-topup-cadence",
          dossierId: "BONU2026-TOPUP-2",
          bonuNummer: "BONU2026-TOPUP-2",
          postcode: "2018",
          startDate: "2026-02-16",
          endDate: "2026-02-20",
        }),
        createWork({
          id: "work-topup-extra-a",
          dossierId: "BONU2026-TOPUP-3",
          bonuNummer: "BONU2026-TOPUP-3",
          postcode: "2018",
          startDate: "2026-02-17",
          endDate: "2026-02-19",
        }),
        createWork({
          id: "work-topup-extra-b",
          dossierId: "BONU2026-TOPUP-4",
          bonuNummer: "BONU2026-TOPUP-4",
          postcode: "2018",
          startDate: "2026-02-17",
          endDate: "2026-02-20",
        }),
      ],
      inspectors: [inspectors[1]],
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      dispatchCapacity: {
        softDailyLimit: 8,
        hardDailyLimit: 8,
        standardVisitWeight: 1,
        complexVisitWeight: 1,
        inspectorOverrides: {},
      },
    });

    const assigned = plan.visitsByInspector["insp-b"] ?? [];
    const assignedWorkIds = new Set(assigned.map((visit) => visit.work.id));

    expect(assigned).toHaveLength(3);
    expect(plan.unassigned).toHaveLength(0);
    expect(assignedWorkIds.has("work-topup-start")).toBe(true);
    expect(assignedWorkIds.has("work-topup-cadence")).toBe(true);
    expect(
      assignedWorkIds.has("work-topup-extra-a") || assignedWorkIds.has("work-topup-extra-b")
    ).toBe(true);
  });

  it("laat dossiers zonder A-sign koppeling toe in dispatch", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({
          id: "work-asign-ok",
          postcode: "2018",
          permitReferenceId: "GW2026-OK",
          permitRefKey: "OK-1",
        }),
        createWork({
          id: "work-gipod-only",
          postcode: "2018",
          permitStatus: "ONBEKEND_MAAR_VERWACHT",
          permitReferenceId: "",
          permitRefKey: "",
        }),
      ],
      inspectors: [inspectors[1]],
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
    });

    const assigned = plan.visitsByInspector["insp-b"] ?? [];
    expect(assigned).toHaveLength(2);
    expect(assigned.some((visit) => visit.work.id === "work-asign-ok")).toBe(true);
    expect(assigned.some((visit) => visit.work.id === "work-gipod-only")).toBe(true);
    expect(plan.unassigned).toHaveLength(0);
  });

  it("sluit dossiers met status vergunning afgelopen uit dispatch", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({
          id: "work-regular",
          postcode: "2018",
        }),
        createWork({
          id: "work-permit-expired",
          postcode: "2018",
          sourceStatus: "Vergunning afgelopen",
          permitDossierStatus: "Vergunning afgelopen",
          permitReferenceId: "GW2026-EXPIRED",
          permitRefKey: "EXPIRED-1",
        }),
      ],
      inspectors: [inspectors[1]],
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
    });

    const assigned = plan.visitsByInspector["insp-b"] ?? [];
    expect(assigned).toHaveLength(1);
    expect(assigned[0].work.id).toBe("work-regular");
    expect(assigned.some((visit) => visit.work.id === "work-permit-expired")).toBe(false);
    expect(plan.unassigned).toHaveLength(0);
  });

  it("geeft voorrang aan grote signalisatieprojecten boven categorie 3 bij beperkte capaciteit", () => {
    const plan = buildDispatchPlan({
      date: "2026-02-16",
      works: [
        createWork({
          id: "work-cat3-first",
          dossierId: "BONU2026-CAT3",
          bonuNummer: "BONU2026-CAT3",
          postcode: "2018",
          gipodCategorie: "Categorie 3",
        }),
        createWork({
          id: "work-large-sign",
          dossierId: "BONU2026-LARGE",
          bonuNummer: "BONU2026-LARGE",
          postcode: "2018",
          gipodCategorie: "Categorie 2",
          permitStatus: "AFGELEVERD",
        }),
      ],
      inspectors: [inspectors[1]],
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      dispatchCapacity: {
        softDailyLimit: 1,
        hardDailyLimit: 1,
        standardVisitWeight: 1,
        complexVisitWeight: 1,
        inspectorOverrides: {},
      },
    });

    const assigned = plan.visitsByInspector["insp-b"] ?? [];
    expect(assigned).toHaveLength(1);
    expect(assigned[0].work.id).toBe("work-large-sign");
    expect(plan.unassigned[0].work.id).toBe("work-cat3-first");
  });
});
