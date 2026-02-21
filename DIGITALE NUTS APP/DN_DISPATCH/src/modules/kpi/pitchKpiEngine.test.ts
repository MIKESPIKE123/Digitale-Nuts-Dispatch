import { describe, expect, it } from "vitest";
import type { PlannedVisit, WorkRecord } from "../../types";
import type {
  ActiveInspectorSession,
  DNVaststellingRecord,
  DNVaststellingSyncItem,
} from "../vaststelling/contracts";
import { buildPitchKpis } from "./pitchKpiEngine";

function createWork(id: string, dossierId: string, endDate: string): WorkRecord {
  return {
    id,
    dossierId,
    bonuNummer: dossierId,
    referentieId: `REF-${id}`,
    gipodId: `1917${id}`,
    werftype: "NUTSWERKEN",
    status: "IN EFFECT",
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

function createVisit(id: string, priority: number, work: WorkRecord): PlannedVisit {
  return {
    id,
    work,
    visitType: "START",
    mandatory: true,
    priority,
    inspectorId: "I1",
    inspectorInitials: "AB",
    inspectorName: "Inspecteur AB",
    inspectorColor: "#0a9396",
    score: priority,
  };
}

function createSession(inspectorId: string, initials: string, name: string): ActiveInspectorSession {
  return {
    inspectorId,
    inspectorInitials: initials,
    inspectorName: name,
    deviceId: "device-1",
    startedAt: "2026-02-20T08:00:00.000Z",
  };
}

function createRecord(
  id: string,
  session: ActiveInspectorSession,
  options: {
    plannedVisitDate: string;
    referentieId: string;
    gipodId: string;
    handoverDecision?: "BLOCK" | "REQUEST_FIX" | "APPROVE";
    checklistScore: number;
  }
): DNVaststellingRecord {
  return {
    id,
    createdAt: `${options.plannedVisitDate}T10:00:00.000Z`,
    updatedAt: `${options.plannedVisitDate}T11:00:00.000Z`,
    completionState: "queued",
    inspectorSession: session,
    immutableContext: {
      workId: "work-ctx",
      dossierId: "DOS-CTX",
      bonuNummer: "BONU-CTX",
      referentieId: options.referentieId,
      gipodId: options.gipodId,
      straat: "Teststraat",
      huisnr: "1",
      postcode: "2000",
      district: "Antwerpen",
      nutsBedrijf: "Fluvius",
      locationSource: "exact",
      latitude: 51.22,
      longitude: 4.4,
      plannedVisitDate: options.plannedVisitDate,
      visitType: "START",
      assignedInspectorId: session.inspectorId,
      assignedInspectorName: session.inspectorName,
    },
    mutablePayload: {
      handoverDecision: options.handoverDecision,
      checklistScore: options.checklistScore,
      formData: {},
    },
    immutableFingerprint: `fp-${id}`,
  };
}

function createSyncItem(
  id: string,
  status: "queued" | "failed" | "synced"
): DNVaststellingSyncItem {
  return {
    id,
    type: "inspection_saved",
    status,
    createdAt: "2026-02-20T12:00:00.000Z",
    payload: {},
    attempts: 0,
  };
}

describe("buildPitchKpis", () => {
  it("berekent de pitch-KPI's met dezelfde labels en kernwaarden", () => {
    const work1 = createWork("1", "DOS-1", "2026-02-21");
    const work2 = createWork("2", "DOS-2", "2026-02-25");
    const visits = [createVisit("v1", 120, work1), createVisit("v2", 90, work2)];

    const sessionA = createSession("I1", "AB", "Inspecteur AB");
    const sessionB = createSession("I2", "CD", "Inspecteur CD");
    const records = [
      createRecord("r1", sessionA, {
        plannedVisitDate: "2026-02-18",
        referentieId: "REF-1",
        gipodId: "19170001",
        handoverDecision: "BLOCK",
        checklistScore: 80,
      }),
      createRecord("r2", sessionB, {
        plannedVisitDate: "2026-02-19",
        referentieId: "",
        gipodId: "",
        checklistScore: 60,
      }),
    ];

    const kpis = buildPitchKpis({
      terrainMode: false,
      activeInspectorSession: null,
      visibleInspectorIds: new Set(),
      selectedDate: "2026-02-20",
      contextWorksCount: 3,
      mapVisits: visits,
      impactByVisitId: {
        v1: { level: "HOOG", score: 85 },
        v2: { level: "MIDDEL", score: 55 },
      },
      records,
      syncQueue: [createSyncItem("s1", "queued"), createSyncItem("s2", "failed"), createSyncItem("s3", "synced")],
    });

    const asMap = new Map(kpis.map((item) => [item.key, item]));

    expect(kpis).toHaveLength(7);
    expect(asMap.get("pitch-dossiers-scope")?.value).toBe("3");
    expect(asMap.get("pitch-inspections-week")?.value).toBe("2");
    expect(asMap.get("pitch-context-quality")?.value).toBe("50%");
    expect(asMap.get("pitch-handover-complete")?.value).toBe("50%");
    expect(asMap.get("pitch-checklist-score")?.value).toBe("70");
    expect(asMap.get("pitch-queue-status")?.value).toBe("1 / 1 / 1");
    expect(asMap.get("pitch-top-priority")?.detail).toContain("DOS-1");
  });

  it("respecteert terreinmodus scope op actieve toezichter", () => {
    const sessionA = createSession("I1", "AB", "Inspecteur AB");
    const sessionB = createSession("I2", "CD", "Inspecteur CD");
    const records = [
      createRecord("r1", sessionA, {
        plannedVisitDate: "2026-02-18",
        referentieId: "REF-1",
        gipodId: "19170001",
        handoverDecision: "BLOCK",
        checklistScore: 80,
      }),
      createRecord("r2", sessionB, {
        plannedVisitDate: "2026-02-19",
        referentieId: "REF-2",
        gipodId: "19170002",
        handoverDecision: "APPROVE",
        checklistScore: 90,
      }),
    ];

    const kpis = buildPitchKpis({
      terrainMode: true,
      activeInspectorSession: sessionA,
      visibleInspectorIds: new Set(),
      selectedDate: "2026-02-20",
      contextWorksCount: 1,
      mapVisits: [],
      impactByVisitId: {},
      records,
      syncQueue: [],
    });

    const asMap = new Map(kpis.map((item) => [item.key, item]));
    expect(asMap.get("pitch-inspections-week")?.value).toBe("1");
    expect(asMap.get("pitch-handover-complete")?.value).toBe("100%");
  });
});
