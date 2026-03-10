import type { DispatchPlan, InspectorAssignmentRole, PlannedVisit } from "../types";


export const ASSIGNMENT_HISTORY_STORAGE_KEY = "dn_dispatch_assignment_history_v1";
export const MAX_ASSIGNMENT_HISTORY_ITEMS = 180;

export interface AssignmentSnapshotRow {
  workId: string;
  dossierId: string;
  inspectorId: string;
  inspectorInitials: string;
  inspectorName: string;
  visitType: PlannedVisit["visitType"];
  mandatory: boolean;
  priority: number;
  assignmentRole?: InspectorAssignmentRole;
  assignmentSource: "AUTO" | "MANUAL";
}

export interface AssignmentSnapshotInspectorSummary {
  inspectorId: string;
  inspectorInitials: string;
  inspectorName: string;
  assignedVisits: number;
  mandatoryVisits: number;
  uniqueWorks: number;
  manualOverrides: number;
}

export interface AssignmentSnapshot {
  dispatchDate: string;
  capturedAt: string;
  assignments: AssignmentSnapshotRow[];
  inspectorSummaries: AssignmentSnapshotInspectorSummary[];
  unassignedWorkIds: string[];
}

type BuildAssignmentSnapshotParams = {
  dispatchDate: string;
  dispatch: DispatchPlan;
  manualInspectorByWorkId: Record<string, string>;
  capturedAt?: string;
};

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIsoDateTime(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T/.test(value);
}

function sanitizeRow(value: unknown): AssignmentSnapshotRow | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const workId = normalizeText(raw.workId);
  const dossierId = normalizeText(raw.dossierId);
  const inspectorId = normalizeText(raw.inspectorId).toUpperCase();
  const inspectorInitials = normalizeText(raw.inspectorInitials).toUpperCase();
  const inspectorName = normalizeText(raw.inspectorName);
  const visitType = normalizeText(raw.visitType).toUpperCase();
  const assignmentSource = normalizeText(raw.assignmentSource).toUpperCase();

  if (
    !workId ||
    !dossierId ||
    !inspectorId ||
    !inspectorInitials ||
    !inspectorName ||
    (visitType !== "START" && visitType !== "EIND" && visitType !== "TUSSEN") ||
    (assignmentSource !== "AUTO" && assignmentSource !== "MANUAL")
  ) {
    return null;
  }

  const mandatory = Boolean(raw.mandatory);
  const priorityRaw = Number(raw.priority);
  const priority = Number.isFinite(priorityRaw) ? Math.round(priorityRaw) : 0;
  const assignmentRoleRaw = normalizeText(raw.assignmentRole).toUpperCase();
  const assignmentRole =
    assignmentRoleRaw === "DEDICATED" ||
    assignmentRoleRaw === "BACKUP" ||
    assignmentRoleRaw === "RESERVE"
      ? assignmentRoleRaw
      : undefined;

  return {
    workId,
    dossierId,
    inspectorId,
    inspectorInitials,
    inspectorName,
    visitType: visitType as PlannedVisit["visitType"],
    mandatory,
    priority,
    assignmentRole,
    assignmentSource: assignmentSource as "AUTO" | "MANUAL",
  };
}

function sanitizeSnapshot(value: unknown): AssignmentSnapshot | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const dispatchDate = normalizeText(raw.dispatchDate);
  const capturedAt = normalizeText(raw.capturedAt);
  if (!isIsoDate(dispatchDate) || !isIsoDateTime(capturedAt)) {
    return null;
  }

  const rows = Array.isArray(raw.assignments)
    ? raw.assignments
        .map((row) => sanitizeRow(row))
        .filter((row): row is AssignmentSnapshotRow => Boolean(row))
    : [];

  const uniqueUnassigned = new Set<string>();
  if (Array.isArray(raw.unassignedWorkIds)) {
    for (const item of raw.unassignedWorkIds) {
      const workId = normalizeText(item);
      if (workId) {
        uniqueUnassigned.add(workId);
      }
    }
  }

  const summaryMap = buildInspectorSummaryMap(rows);
  const inspectorSummaries = buildInspectorSummaries(summaryMap);

  return {
    dispatchDate,
    capturedAt,
    assignments: rows,
    inspectorSummaries,
    unassignedWorkIds: [...uniqueUnassigned].sort((a, b) => a.localeCompare(b, "nl")),
  };
}

function buildInspectorSummaryMap(rows: AssignmentSnapshotRow[]): Map<string, {
  inspectorInitials: string;
  inspectorName: string;
  assignedVisits: number;
  mandatoryVisits: number;
  manualOverrides: number;
  uniqueWorkIds: Set<string>;
}> {
  const byInspector = new Map<
    string,
    {
      inspectorInitials: string;
      inspectorName: string;
      assignedVisits: number;
      mandatoryVisits: number;
      manualOverrides: number;
      uniqueWorkIds: Set<string>;
    }
  >();

  for (const row of rows) {
    const existing = byInspector.get(row.inspectorId) ?? {
      inspectorInitials: row.inspectorInitials,
      inspectorName: row.inspectorName,
      assignedVisits: 0,
      mandatoryVisits: 0,
      manualOverrides: 0,
      uniqueWorkIds: new Set<string>(),
    };

    existing.inspectorInitials = row.inspectorInitials;
    existing.inspectorName = row.inspectorName;
    existing.assignedVisits += 1;
    if (row.mandatory) {
      existing.mandatoryVisits += 1;
    }
    if (row.assignmentSource === "MANUAL") {
      existing.manualOverrides += 1;
    }
    existing.uniqueWorkIds.add(row.workId);
    byInspector.set(row.inspectorId, existing);
  }

  return byInspector;
}

function buildInspectorSummaries(
  summaryMap: Map<
    string,
    {
      inspectorInitials: string;
      inspectorName: string;
      assignedVisits: number;
      mandatoryVisits: number;
      manualOverrides: number;
      uniqueWorkIds: Set<string>;
    }
  >
): AssignmentSnapshotInspectorSummary[] {
  return [...summaryMap.entries()]
    .map(([inspectorId, value]) => ({
      inspectorId,
      inspectorInitials: value.inspectorInitials,
      inspectorName: value.inspectorName,
      assignedVisits: value.assignedVisits,
      mandatoryVisits: value.mandatoryVisits,
      uniqueWorks: value.uniqueWorkIds.size,
      manualOverrides: value.manualOverrides,
    }))
    .sort((a, b) => a.inspectorId.localeCompare(b.inspectorId, "nl", { numeric: true }));
}

export function buildAssignmentSnapshot({
  dispatchDate,
  dispatch,
  manualInspectorByWorkId,
  capturedAt,
}: BuildAssignmentSnapshotParams): AssignmentSnapshot {
  const rows: AssignmentSnapshotRow[] = [];

  for (const visits of Object.values(dispatch.visitsByInspector)) {
    for (const visit of visits) {
      rows.push({
        workId: visit.work.id,
        dossierId: visit.work.dossierId,
        inspectorId: visit.inspectorId,
        inspectorInitials: visit.inspectorInitials,
        inspectorName: visit.inspectorName,
        visitType: visit.visitType,
        mandatory: visit.mandatory,
        priority: visit.priority,
        assignmentRole: visit.inspectorAssignmentRole,
        assignmentSource:
          normalizeText(manualInspectorByWorkId[visit.work.id]).toUpperCase() === visit.inspectorId
            ? "MANUAL"
            : "AUTO",
      });
    }
  }

  rows.sort((a, b) => {
    if (a.inspectorId !== b.inspectorId) {
      return a.inspectorId.localeCompare(b.inspectorId, "nl", { numeric: true });
    }
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return a.dossierId.localeCompare(b.dossierId, "nl");
  });

  const summaryMap = buildInspectorSummaryMap(rows);
  const unassignedWorkIds = [
    ...new Set(dispatch.unassigned.map((visit) => normalizeText(visit.work.id)).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, "nl"));

  return {
    dispatchDate,
    capturedAt: capturedAt ?? new Date().toISOString(),
    assignments: rows,
    inspectorSummaries: buildInspectorSummaries(summaryMap),
    unassignedWorkIds,
  };
}

export function upsertAssignmentHistory(
  history: AssignmentSnapshot[],
  snapshot: AssignmentSnapshot
): AssignmentSnapshot[] {
  const sanitizedSnapshot = sanitizeSnapshot(snapshot);
  if (!sanitizedSnapshot) {
    return history;
  }

  const kept = history.filter((item) => item.dispatchDate !== sanitizedSnapshot.dispatchDate);
  const merged = [sanitizedSnapshot, ...kept];

  merged.sort((a, b) => {
    if (a.dispatchDate !== b.dispatchDate) {
      return b.dispatchDate.localeCompare(a.dispatchDate);
    }
    return b.capturedAt.localeCompare(a.capturedAt);
  });

  return merged.slice(0, MAX_ASSIGNMENT_HISTORY_ITEMS);
}

export function loadAssignmentHistory(): AssignmentSnapshot[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed
      .map((item) => sanitizeSnapshot(item))
      .filter((item): item is AssignmentSnapshot => Boolean(item));

    sanitized.sort((a, b) => {
      if (a.dispatchDate !== b.dispatchDate) {
        return b.dispatchDate.localeCompare(a.dispatchDate);
      }
      return b.capturedAt.localeCompare(a.capturedAt);
    });

    return sanitized.slice(0, MAX_ASSIGNMENT_HISTORY_ITEMS);
  } catch {
    return [];
  }
}

export function saveAssignmentHistory(history: AssignmentSnapshot[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const sanitized = history
      .map((item) => sanitizeSnapshot(item))
      .filter((item): item is AssignmentSnapshot => Boolean(item))
      .slice(0, MAX_ASSIGNMENT_HISTORY_ITEMS);
    window.localStorage.setItem(ASSIGNMENT_HISTORY_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore storage errors
  }
}

export function getAssignmentSnapshotByDate(
  history: AssignmentSnapshot[],
  dispatchDate: string
): AssignmentSnapshot | null {
  if (!isIsoDate(dispatchDate)) {
    return null;
  }
  return history.find((item) => item.dispatchDate === dispatchDate) ?? null;
}
