import type { DNVaststellingRecord, DNVaststellingSyncItem } from "../vaststelling/contracts";
import { countNokFindings } from "../vaststelling/validation";

export const INSPECTION_EXPORT_FLAT_COLUMNS = [
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
] as const;

export const REQUIRED_EXPORT_AUDIT_METADATA = [
  "reportType",
  "generatedAt",
  "generatedBy",
  "filterSet",
  "sourceWindow",
  "contractVersion",
  "rowCount",
] as const;

export type InspectionExportFlatColumn = (typeof INSPECTION_EXPORT_FLAT_COLUMNS)[number];

export type InspectionExportFlatRow = Record<
  InspectionExportFlatColumn,
  string | number | null
>;

export interface InspectionExportWarning {
  code: "optional_field_missing" | "invalid_since_timestamp";
  inspectionId?: string;
  field?: string;
  message: string;
}

export interface InspectionExportFlatDataset {
  reportType: "inspection_export_flat";
  generatedAt: string;
  generatedBy: string;
  filterSet: {
    sinceTimestamp?: string;
  };
  sourceWindow: {
    sinceTimestamp: string | null;
    minUpdatedAt: string | null;
    maxUpdatedAt: string | null;
  };
  contractVersion: string;
  rowCount: number;
  rows: InspectionExportFlatRow[];
  warnings: InspectionExportWarning[];
}

export interface BuildInspectionExportFlatInput {
  records: DNVaststellingRecord[];
  syncQueue: DNVaststellingSyncItem[];
  generatedBy: string;
  generatedAt?: string;
  sinceTimestamp?: string;
  contractVersion?: string;
}

const DEFAULT_CONTRACT_VERSION = "v1.0";
const OPTIONAL_WARNING_FIELDS = ["permitReference", "contractorId", "fotoDetail_url"] as const;

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveQueueTimestamp(item: DNVaststellingSyncItem): number {
  const candidate = item.lastAttemptAt ?? item.syncedAt ?? item.createdAt;
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function mapLatestSyncByInspectionId(
  syncQueue: DNVaststellingSyncItem[]
): Map<string, DNVaststellingSyncItem> {
  const latestByInspectionId = new Map<string, DNVaststellingSyncItem>();

  for (const item of syncQueue) {
    const inspectionId = normalizeText(item.payload.inspectionId);
    if (!inspectionId) {
      continue;
    }

    const existing = latestByInspectionId.get(inspectionId);
    if (!existing) {
      latestByInspectionId.set(inspectionId, item);
      continue;
    }

    if (resolveQueueTimestamp(item) >= resolveQueueTimestamp(existing)) {
      latestByInspectionId.set(inspectionId, item);
    }
  }

  return latestByInspectionId;
}

function toIsoTimestamp(value: string): string | null {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function hasOptionalFieldValue(record: DNVaststellingRecord, field: string): boolean {
  const formData = record.mutablePayload.formData;
  const valueFromForm = formData && field in formData ? formData[field] : undefined;

  if (typeof valueFromForm === "string") {
    return valueFromForm.trim().length > 0;
  }

  if (Array.isArray(valueFromForm)) {
    return valueFromForm.length > 0;
  }

  const valueFromPayload = record.mutablePayload[field];
  if (typeof valueFromPayload === "string") {
    return valueFromPayload.trim().length > 0;
  }

  if (Array.isArray(valueFromPayload)) {
    return valueFromPayload.length > 0;
  }

  return false;
}

function resolveStatusCanonical(
  record: DNVaststellingRecord,
  latestSync: DNVaststellingSyncItem | undefined
): "planned" | "in_progress" | "temporary_restore" | "closed" {
  if (latestSync?.serverMappedStatus) {
    return latestSync.serverMappedStatus;
  }

  const formData = record.mutablePayload.formData ?? {};
  const fase = normalizeText(formData.fase);
  const status = normalizeText(formData.status);

  if (status === "afgesloten" || fase === "definitief_herstel") {
    return "closed";
  }

  if (fase === "tijdelijk_herstel") {
    return "temporary_restore";
  }

  if (record.completionState === "draft" || record.completionState === "valid") {
    return "planned";
  }

  return "in_progress";
}

function resolveSyncStatus(
  record: DNVaststellingRecord,
  latestSync: DNVaststellingSyncItem | undefined
): "queued" | "synced" | "failed" {
  if (latestSync?.status) {
    return latestSync.status;
  }

  if (record.completionState === "synced") {
    return "synced";
  }

  return "queued";
}

function resolveNokCount(record: DNVaststellingRecord): number {
  if (typeof record.mutablePayload.nokCount === "number" && Number.isFinite(record.mutablePayload.nokCount)) {
    return record.mutablePayload.nokCount;
  }

  const formData = record.mutablePayload.formData;
  if (!formData || typeof formData !== "object") {
    return 0;
  }

  const normalizedFormData = Object.entries(formData).reduce<Record<string, string | string[]>>(
    (acc, [key, value]) => {
      if (typeof value === "string" || Array.isArray(value)) {
        acc[key] = value;
      }
      return acc;
    },
    {}
  );

  return countNokFindings(normalizedFormData);
}

function resolveChecklistScore(record: DNVaststellingRecord): number | null {
  if (typeof record.mutablePayload.checklistScore === "number" && Number.isFinite(record.mutablePayload.checklistScore)) {
    return Math.round(record.mutablePayload.checklistScore);
  }

  if (
    record.mutablePayload.checklistScoreDetails &&
    typeof record.mutablePayload.checklistScoreDetails.score === "number" &&
    Number.isFinite(record.mutablePayload.checklistScoreDetails.score)
  ) {
    return Math.round(record.mutablePayload.checklistScoreDetails.score);
  }

  return null;
}

function resolvePhotoEvidenceCount(record: DNVaststellingRecord): number {
  if (!Array.isArray(record.mutablePayload.photoEvidence)) {
    return 0;
  }
  return record.mutablePayload.photoEvidence.length;
}

function buildRow(
  record: DNVaststellingRecord,
  latestSync: DNVaststellingSyncItem | undefined,
  contractVersion: string
): InspectionExportFlatRow {
  return {
    inspectionId: record.id,
    recordId: record.id,
    workId: record.immutableContext.workId,
    gipodId: record.immutableContext.gipodId,
    district: record.immutableContext.district,
    inspectorId: record.inspectorSession.inspectorId,
    statusCanonical: resolveStatusCanonical(record, latestSync),
    handoverDecision: normalizeText(record.mutablePayload.handoverDecision) || null,
    nokCount: resolveNokCount(record),
    checklistScore: resolveChecklistScore(record),
    updatedAt: record.updatedAt,
    photoEvidenceCount: resolvePhotoEvidenceCount(record),
    syncStatus: resolveSyncStatus(record, latestSync),
    serverOutcome: latestSync?.serverOutcome ?? null,
    contractVersion,
  };
}

function escapeCsvValue(value: string | number | null): string {
  if (value === null) {
    return "";
  }
  const text = `${value}`;
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, "\"\"")}"`;
}

export function buildInspectionExportFlatDataset({
  records,
  syncQueue,
  generatedBy,
  generatedAt,
  sinceTimestamp,
  contractVersion = DEFAULT_CONTRACT_VERSION,
}: BuildInspectionExportFlatInput): InspectionExportFlatDataset {
  const warnings: InspectionExportWarning[] = [];
  const warningKeys = new Set<string>();
  const latestSyncByInspectionId = mapLatestSyncByInspectionId(syncQueue);
  const normalizedSinceTimestamp = sinceTimestamp ? toIsoTimestamp(sinceTimestamp) : null;

  if (sinceTimestamp && !normalizedSinceTimestamp) {
    warnings.push({
      code: "invalid_since_timestamp",
      message: `sinceTimestamp is ongeldig en werd genegeerd: ${sinceTimestamp}`,
    });
  }

  const rows: InspectionExportFlatRow[] = [];

  for (const record of records) {
    if (normalizedSinceTimestamp && record.updatedAt < normalizedSinceTimestamp) {
      continue;
    }

    const latestSync = latestSyncByInspectionId.get(record.id);
    const row = buildRow(record, latestSync, contractVersion);
    rows.push(row);

    for (const field of OPTIONAL_WARNING_FIELDS) {
      if (hasOptionalFieldValue(record, field)) {
        continue;
      }

      const warningKey = `${record.id}|${field}`;
      if (warningKeys.has(warningKey)) {
        continue;
      }

      warningKeys.add(warningKey);
      warnings.push({
        code: "optional_field_missing",
        inspectionId: record.id,
        field,
        message: `Optioneel veld ontbreekt: ${field}`,
      });
    }
  }

  const updatedAtValues = rows
    .map((row) => normalizeText(row.updatedAt))
    .filter((value) => value.length > 0)
    .sort((a, b) => a.localeCompare(b));

  return {
    reportType: "inspection_export_flat",
    generatedAt: generatedAt ?? new Date().toISOString(),
    generatedBy: normalizeText(generatedBy) || "onbekend",
    filterSet: normalizedSinceTimestamp ? { sinceTimestamp: normalizedSinceTimestamp } : {},
    sourceWindow: {
      sinceTimestamp: normalizedSinceTimestamp,
      minUpdatedAt: updatedAtValues[0] ?? null,
      maxUpdatedAt: updatedAtValues[updatedAtValues.length - 1] ?? null,
    },
    contractVersion,
    rowCount: rows.length,
    rows,
    warnings,
  };
}

export function buildInspectionExportFlatCsv(dataset: InspectionExportFlatDataset): string {
  const header = INSPECTION_EXPORT_FLAT_COLUMNS.join(",");
  const body = dataset.rows.map((row) =>
    INSPECTION_EXPORT_FLAT_COLUMNS.map((column) =>
      escapeCsvValue(row[column])
    ).join(",")
  );
  return [header, ...body].join("\n");
}
