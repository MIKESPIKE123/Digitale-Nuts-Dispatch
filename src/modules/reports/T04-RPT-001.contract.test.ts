import { describe, expect, it } from "vitest";
import type { DNVaststellingRecord, DNVaststellingSyncItem } from "../vaststelling/contracts";
import {
  buildInspectionExportFlatCsv,
  buildInspectionExportFlatDataset,
  INSPECTION_EXPORT_FLAT_COLUMNS,
  REQUIRED_EXPORT_AUDIT_METADATA,
  type InspectionExportFlatRow,
} from "./inspectionExport";

function assertRequiredColumns(row: Record<string, unknown>): void {
  for (const key of INSPECTION_EXPORT_FLAT_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      throw new Error(`Missing required column: ${key}`);
    }
  }
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (inQuotes) {
      if (char === "\"") {
        if (line[index + 1] === "\"") {
          current += "\"";
          index += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      current += char;
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function parseCsvRows(csv: string): Record<string, string>[] {
  const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function createRecord(
  id: string,
  updatedAt: string,
  overrides: Partial<DNVaststellingRecord> = {}
): DNVaststellingRecord {
  return {
    id,
    createdAt: "2026-02-20T08:00:00.000Z",
    updatedAt,
    completionState: "queued",
    inspectorSession: {
      inspectorId: "I1",
      inspectorName: "Toezichter AB",
      inspectorInitials: "AB",
      deviceId: "device-1",
      startedAt: "2026-02-20T08:00:00.000Z",
    },
    immutableContext: {
      workId: `work-${id}`,
      dossierId: `dossier-${id}`,
      bonuNummer: `BONU-${id}`,
      referentieId: `REF-${id}`,
      gipodId: "19170001",
      straat: "Teststraat",
      huisnr: "1",
      postcode: "2000",
      district: "Antwerpen",
      nutsBedrijf: "Fluvius",
      locationSource: "exact",
      latitude: 51.2,
      longitude: 4.4,
      plannedVisitDate: "2026-02-20",
      visitType: "TUSSEN",
      assignedInspectorId: "I1",
      assignedInspectorName: "Toezichter AB",
    },
    mutablePayload: {
      handoverDecision: "REQUEST_FIX",
      nokCount: 2,
      checklistScore: 72,
      formData: {
        status: "in_behandeling",
        fase: "uitvoering",
        permitReference: "P-001",
        contractorId: "C-001",
        fotoDetail_url: "photo://detail",
      },
      photoEvidence: [
        {
          fieldKey: "fotoDetail_url",
          url: "photo://detail",
          photoId: `photo-${id}`,
          takenAt: "2026-02-20T08:30:00.000Z",
          lat: 51.2,
          lon: 4.4,
          actorId: "I1",
          actorName: "Toezichter AB",
          hash: "hash-1",
          source: "mock",
        },
      ],
    },
    immutableFingerprint: `fp-${id}`,
    ...overrides,
  };
}

function createSyncItem(
  inspectionId: string,
  overrides: Partial<DNVaststellingSyncItem> = {}
): DNVaststellingSyncItem {
  return {
    id: `sync-${inspectionId}`,
    type: "inspection_saved",
    status: "synced",
    createdAt: "2026-02-20T09:00:00.000Z",
    payload: {
      inspectionId,
    },
    attempts: 1,
    responseCode: 200,
    serverOutcome: "accepted",
    serverMappedStatus: "in_progress",
    ...overrides,
  };
}

describe("T04-RPT-001 contract - inspection_export_flat", () => {
  it("pins mandatory v1 columns from report spec", () => {
    expect(INSPECTION_EXPORT_FLAT_COLUMNS).toHaveLength(15);
    expect(INSPECTION_EXPORT_FLAT_COLUMNS).toEqual([
      "inspectionId",
      "recordId",
      "workId",
      "gipodId",
      "district",
      "inspectorId",
      "statusCanonical",
      "handoverDecision",
      "nokCount",
      "checklistScore",
      "updatedAt",
      "photoEvidenceCount",
      "syncStatus",
      "serverOutcome",
      "contractVersion",
    ]);
  });

  it("pins mandatory export audit metadata keys", () => {
    expect(REQUIRED_EXPORT_AUDIT_METADATA).toEqual([
      "reportType",
      "generatedAt",
      "generatedBy",
      "filterSet",
      "sourceWindow",
      "contractVersion",
      "rowCount",
    ]);
  });

  it("accepts a minimal fixture row with all mandatory fields", () => {
    const row: InspectionExportFlatRow = {
      inspectionId: "insp-1",
      recordId: "rec-1",
      workId: "work-1",
      gipodId: "19170001",
      district: "Antwerpen",
      inspectorId: "AB",
      statusCanonical: "in_progress",
      handoverDecision: "REQUEST_FIX",
      nokCount: 2,
      checklistScore: 72,
      updatedAt: "2026-02-20T17:30:00.000Z",
      photoEvidenceCount: 3,
      syncStatus: "synced",
      serverOutcome: "accepted",
      contractVersion: "v1.0",
    };

    expect(() => assertRequiredColumns(row)).not.toThrow();
  });

  it("validates CSV and JSON parity on inspection_export_flat payloads", () => {
    const dataset = buildInspectionExportFlatDataset({
      records: [
        createRecord("rec-1", "2026-02-20T10:00:00.000Z"),
        createRecord("rec-2", "2026-02-20T11:00:00.000Z", {
          completionState: "synced",
        }),
      ],
      syncQueue: [
        createSyncItem("rec-1"),
        createSyncItem("rec-2", { serverOutcome: "duplicate", status: "synced" }),
      ],
      generatedBy: "qa-user",
      generatedAt: "2026-02-20T12:00:00.000Z",
      contractVersion: "v1.0",
    });

    expect(dataset.rowCount).toBe(2);
    expect(dataset.rows).toHaveLength(2);

    const csv = buildInspectionExportFlatCsv(dataset);
    const parsedRows = parseCsvRows(csv);

    expect(parsedRows).toHaveLength(dataset.rows.length);
    parsedRows.forEach((parsedRow, rowIndex) => {
      for (const column of INSPECTION_EXPORT_FLAT_COLUMNS) {
        const expectedValue = dataset.rows[rowIndex][column];
        const expectedAsCsvCell = expectedValue === null ? "" : `${expectedValue}`;
        expect(parsedRow[column]).toBe(expectedAsCsvCell);
      }
    });
  });

  it("validates delta-export filtering with sinceTimestamp", () => {
    const dataset = buildInspectionExportFlatDataset({
      records: [
        createRecord("rec-old", "2026-02-20T09:00:00.000Z"),
        createRecord("rec-new", "2026-02-20T11:15:00.000Z"),
      ],
      syncQueue: [createSyncItem("rec-old"), createSyncItem("rec-new")],
      generatedBy: "qa-user",
      sinceTimestamp: "2026-02-20T10:30:00.000Z",
    });

    expect(dataset.rowCount).toBe(1);
    expect(dataset.rows[0].inspectionId).toBe("rec-new");
    expect(dataset.filterSet.sinceTimestamp).toBe("2026-02-20T10:30:00.000Z");
    expect(dataset.sourceWindow.sinceTimestamp).toBe("2026-02-20T10:30:00.000Z");
  });

  it("asserts warning policy for optional fields without hard fail", () => {
    const record = createRecord("rec-warning", "2026-02-20T13:00:00.000Z");
    record.mutablePayload.formData = {
      status: "in_behandeling",
      fase: "uitvoering",
    };
    record.mutablePayload.photoEvidence = [];

    const dataset = buildInspectionExportFlatDataset({
      records: [record],
      syncQueue: [createSyncItem("rec-warning")],
      generatedBy: "qa-user",
    });

    expect(dataset.rowCount).toBe(1);
    expect(dataset.rows).toHaveLength(1);
    expect(dataset.warnings.length).toBeGreaterThanOrEqual(3);
    expect(
      dataset.warnings.filter((warning) => warning.code === "optional_field_missing")
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ inspectionId: "rec-warning", field: "permitReference" }),
        expect.objectContaining({ inspectionId: "rec-warning", field: "contractorId" }),
        expect.objectContaining({ inspectionId: "rec-warning", field: "fotoDetail_url" }),
      ])
    );
  });
});
