import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDispatchPlan } from "../lib/dispatch";
import * as integrationFactory from "../modules/integrations/factory";
import { MockInspectionsGateway } from "../modules/integrations/mock/MockInspectionsGateway";
import type { DNVaststellingFieldValue } from "../modules/vaststelling/contracts";
import { buildInspectorSession, createDNVaststellingDraft, mapVisitToDNVaststellingContext } from "../modules/vaststelling/mappers";
import { buildNokSummaryRows, buildVaststellingReportRows } from "../modules/vaststelling/reportModel";
import type { ParsedSchema } from "../modules/vaststelling/schema";
import { enqueueInspectionSync, runDNVaststellingSyncBatch } from "../modules/vaststelling/sync";
import { validateDNVaststellingRecord } from "../modules/vaststelling/validation";
import type { Inspector, WorkRecord } from "../types";

type SchemaField = {
  key: string;
  label: string;
  required: boolean;
  type?: "input" | "textarea" | "select" | "multiselect";
};

function createSchema(fields: SchemaField[]): ParsedSchema {
  const items = fields.map((field) => ({
    key: field.key,
    label: field.label,
    type: field.type ?? "select",
    required: field.required,
    options: [],
  }));

  const fieldsByKey = Object.fromEntries(items.map((item) => [item.key, item]));
  const fieldsByLabel = Object.fromEntries(items.map((item) => [item.label.toLowerCase(), item]));

  return {
    sections: [
      {
        id: "basis",
        title: "Basis",
        items,
      },
    ],
    defaults: {
      inspectors: [],
      postcodes: [],
    },
    index: {
      fieldsByLabel,
      fieldsByKey,
    },
  };
}

function createWork(overrides: Partial<WorkRecord> = {}): WorkRecord {
  return {
    id: "work-1",
    dossierId: "BONU2026-0001",
    bonuNummer: "BONU2026-0001",
    referentieId: "REF-1",
    gipodId: "19170001",
    werftype: "NUTSWERKEN",
    status: "VERGUND",
    startDate: "2026-02-20",
    endDate: "2026-02-20",
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
    id: "insp-1",
    initials: "AB",
    name: "Toezichter AB",
    color: "#0a9396",
    primaryPostcodes: ["2018"],
    backupPostcodes: ["2000"],
  },
];

const schema = createSchema([
  { key: "district", label: "District", required: true },
  { key: "ingreepType", label: "Type ingreep", required: true },
  { key: "fase", label: "Fase", required: true },
  { key: "verhardingType", label: "Verharding", required: true },
  { key: "termijnHerstel", label: "Uiterste hersteldatum", required: true, type: "input" },
  { key: "status", label: "Status", required: true },
  { key: "veiligheidscontrole", label: "Veiligheidscontrole", required: false },
]);

describe("T05-E2E-001 smoke", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    integrationFactory.resetIntegrationGatewayCache();
  });

  it("runs dispatch -> vaststelling -> sync -> report for the core chain", async () => {
    const dispatchDate = "2026-02-20";
    const plan = buildDispatchPlan({
      date: dispatchDate,
      works: [createWork()],
      inspectors,
      holidays: [],
      statuses: ["VERGUND", "IN EFFECT"],
      districts: [],
      postcodes: [],
      stickyInspectorByWorkId: {
        "work-1": "insp-1",
      },
    });

    expect(plan.totals.plannedVisits).toBe(1);

    const visit = plan.visitsByInspector["insp-1"]?.[0];
    expect(visit).toBeDefined();
    if (!visit) {
      throw new Error("Expected one visit for smoke flow.");
    }

    const session = buildInspectorSession(inspectors[0], "device-smoke");
    const context = mapVisitToDNVaststellingContext(visit, dispatchDate);
    const draft = createDNVaststellingDraft({
      session,
      context,
    });

    const formData: Record<string, DNVaststellingFieldValue> = {
      district: "Antwerpen",
      ingreepType: "sleuf",
      fase: "uitvoering",
      verhardingType: "beton",
      termijnHerstel: "2026-02-27",
      status: "in_behandeling",
      veiligheidscontrole: "NOK, signalisatie ontbreekt",
      veiligheidscontrole__responsible: "Aannemer",
    };

    draft.mutablePayload.metaLocation = "Teststraat 1";
    draft.mutablePayload.formData = formData;

    const validation = validateDNVaststellingRecord(schema, draft);
    expect(validation.isValid).toBe(true);

    draft.completionState = "queued";
    draft.updatedAt = "2026-02-20T10:00:00.000Z";

    const queued = enqueueInspectionSync([], draft);
    expect(queued).toHaveLength(1);

    vi.stubGlobal("navigator", { onLine: true });
    vi.spyOn(integrationFactory, "getInspectionsGateway").mockReturnValue(
      new MockInspectionsGateway()
    );

    const syncResult = await runDNVaststellingSyncBatch(
      queued,
      {
        endpoint: "/api/inspecties/sync",
        autoSyncOnOnline: true,
        requestTimeoutMs: 15000,
      },
      {
        deviceId: session.deviceId,
      }
    );

    expect(syncResult.processedCount).toBe(1);
    expect(syncResult.syncedCount).toBe(1);
    expect(syncResult.failedCount).toBe(0);
    expect(syncResult.updatedQueue[0].status).toBe("synced");
    expect(syncResult.updatedQueue[0].serverOutcome).toBe("accepted");

    const reportRows = buildVaststellingReportRows(schema, formData);
    const nokRows = buildNokSummaryRows(reportRows);

    expect(reportRows.length).toBeGreaterThan(0);
    expect(nokRows).toHaveLength(1);
    expect(nokRows[0].description).toContain("Verantwoordelijke: Aannemer");
  });
});
