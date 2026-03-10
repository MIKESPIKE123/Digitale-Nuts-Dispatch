import { afterEach, describe, expect, it, vi } from "vitest";
import type { DispatchPlan, Inspector, PlannedVisit, WorkRecord } from "../types";
import {
  ASSIGNMENT_HISTORY_STORAGE_KEY,
  buildAssignmentSnapshot,
  getAssignmentSnapshotByDate,
  loadAssignmentHistory,
  saveAssignmentHistory,
  upsertAssignmentHistory,
} from "./assignmentHistory";

function createLocalStorageMock(seed: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(seed));

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

function makeInspector(id: string, initials: string): Inspector {
  return {
    id,
    initials,
    name: `Toezichter ${initials}`,
    color: "#0a9396",
    primaryPostcodes: ["2000"],
    backupPostcodes: ["2018"],
  };
}

function makeWork(workId: string, dossierId: string): WorkRecord {
  return {
    id: workId,
    dossierId,
    bonuNummer: `BONU-${workId}`,
    referentieId: workId.replace(/\D/g, "") || "100",
    gipodId: workId.replace(/\D/g, "") || "100",
    werftype: "NUTS",
    status: "IN EFFECT",
    sourceStatus: "In uitvoering",
    startDate: "2026-02-20",
    endDate: "2026-02-25",
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

function makeVisit(work: WorkRecord, inspector: Inspector, visitType: PlannedVisit["visitType"]): PlannedVisit {
  return {
    id: `${work.id}-${inspector.id}-${visitType}`,
    work,
    visitType,
    mandatory: true,
    priority: 80,
    inspectorId: inspector.id,
    inspectorInitials: inspector.initials,
    inspectorName: inspector.name ?? inspector.initials,
    inspectorAssignmentRole: "DEDICATED",
    inspectorColor: inspector.color,
    score: 88,
  };
}

function makeDispatch(visitsByInspector: Record<string, PlannedVisit[]>): DispatchPlan {
  return {
    date: "2026-02-22",
    isWorkday: true,
    visitsByInspector,
    followUpsByInspector: {},
    preferredInspectorByWorkId: {},
    unassigned: [],
    totals: {
      plannedVisits: Object.values(visitsByInspector).flat().length,
      mandatoryVisits: Object.values(visitsByInspector).flat().length,
      optionalVisits: 0,
      overflowInspectors: 0,
      followUps: 0,
      approvedPermitVisits: 0,
      permitBackedVisits: 0,
      withoutPermitVisits: 0,
      withoutPermitSharePct: 0,
    },
  };
}

describe("assignmentHistory", () => {
  it("bouwt snapshot met manual/auto bron en inspector samenvatting", () => {
    const i1 = makeInspector("I1", "AB");
    const i2 = makeInspector("I2", "CD");
    const w1 = makeWork("W1", "GIPOD-1");
    const w2 = makeWork("W2", "GIPOD-2");
    const dispatch = makeDispatch({
      I1: [makeVisit(w1, i1, "START")],
      I2: [makeVisit(w2, i2, "EIND")],
    });

    const snapshot = buildAssignmentSnapshot({
      dispatchDate: "2026-02-22",
      dispatch,
      manualInspectorByWorkId: {
        W2: "I2",
      },
      capturedAt: "2026-02-22T10:00:00.000Z",
    });

    expect(snapshot.assignments).toHaveLength(2);
    expect(snapshot.assignments.find((row) => row.workId === "W2")?.assignmentSource).toBe("MANUAL");
    expect(snapshot.inspectorSummaries.find((row) => row.inspectorId === "I2")?.manualOverrides).toBe(1);
  });

  it("upsert vervangt bestaande snapshot op dezelfde dispatchdatum", () => {
    const i1 = makeInspector("I1", "AB");
    const w1 = makeWork("W1", "GIPOD-1");

    const first = buildAssignmentSnapshot({
      dispatchDate: "2026-02-22",
      dispatch: makeDispatch({ I1: [makeVisit(w1, i1, "START")] }),
      manualInspectorByWorkId: {},
      capturedAt: "2026-02-22T09:00:00.000Z",
    });

    const second = buildAssignmentSnapshot({
      dispatchDate: "2026-02-22",
      dispatch: makeDispatch({ I1: [makeVisit(w1, i1, "EIND")] }),
      manualInspectorByWorkId: {},
      capturedAt: "2026-02-22T10:00:00.000Z",
    });

    const merged = upsertAssignmentHistory([first], second);
    expect(merged).toHaveLength(1);
    expect(merged[0].capturedAt).toBe("2026-02-22T10:00:00.000Z");
  });

  it("laadt en bewaart historiek in localStorage", () => {
    const storage = createLocalStorageMock();
    vi.stubGlobal("window", { localStorage: storage });

    saveAssignmentHistory([
      {
        dispatchDate: "2026-02-22",
        capturedAt: "2026-02-22T10:00:00.000Z",
        assignments: [],
        inspectorSummaries: [],
        unassignedWorkIds: [],
      },
    ]);

    const loaded = loadAssignmentHistory();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].dispatchDate).toBe("2026-02-22");
    expect(storage.getItem(ASSIGNMENT_HISTORY_STORAGE_KEY)).toContain("2026-02-22");
    expect(getAssignmentSnapshotByDate(loaded, "2026-02-22")?.dispatchDate).toBe("2026-02-22");
  });
});
