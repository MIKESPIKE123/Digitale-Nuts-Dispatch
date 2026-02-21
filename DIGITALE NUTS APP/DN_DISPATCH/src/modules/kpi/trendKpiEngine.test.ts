import { describe, expect, it } from "vitest";
import type { ActiveInspectorSession, DNVaststellingRecord } from "../vaststelling/contracts";
import { buildWeekOverWeekTrendKpis } from "./trendKpiEngine";

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
  plannedVisitDate: string,
  checklistScore: number,
  withHandover: boolean
): DNVaststellingRecord {
  return {
    id,
    createdAt: `${plannedVisitDate}T09:00:00.000Z`,
    updatedAt: `${plannedVisitDate}T10:00:00.000Z`,
    completionState: "queued",
    inspectorSession: session,
    immutableContext: {
      workId: `work-${id}`,
      dossierId: `DOS-${id}`,
      bonuNummer: `BONU-${id}`,
      referentieId: `REF-${id}`,
      gipodId: `1917${id}`,
      straat: "Teststraat",
      huisnr: "1",
      postcode: "2000",
      district: "Antwerpen",
      nutsBedrijf: "Fluvius",
      locationSource: "exact",
      latitude: 51.22,
      longitude: 4.4,
      plannedVisitDate,
      visitType: "START",
      assignedInspectorId: session.inspectorId,
      assignedInspectorName: session.inspectorName,
    },
    mutablePayload: {
      checklistScore,
      handoverDecision: withHandover ? "APPROVE" : undefined,
      formData: {},
    },
    immutableFingerprint: `fp-${id}`,
  };
}

describe("buildWeekOverWeekTrendKpis", () => {
  it("berekent week-op-week trend op vaste KPI-keys", () => {
    const sessionA = createSession("I1", "AB", "Inspecteur AB");
    const records = [
      createRecord("1", sessionA, "2026-02-17", 80, true),
      createRecord("2", sessionA, "2026-02-18", 65, false),
      createRecord("3", sessionA, "2026-02-10", 90, true),
    ];

    const trend = buildWeekOverWeekTrendKpis({
      terrainMode: false,
      activeInspectorSession: null,
      visibleInspectorIds: new Set(),
      selectedDate: "2026-02-20",
      records,
    });

    expect(trend).toHaveLength(4);
    expect(trend[0].key).toBe("wow-count");
    expect(trend[1].key).toBe("wow-score");
    expect(trend[2].key).toBe("wow-handover");
    expect(trend[3].key).toBe("wow-low-score");
    expect(trend[0].currentValue).toBe("2");
  });
});
