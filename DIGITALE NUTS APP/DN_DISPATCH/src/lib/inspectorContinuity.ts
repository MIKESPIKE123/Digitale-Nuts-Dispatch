import type { PlannedVisit } from "../types";

const CONTINUITY_STORAGE_KEY = "dn_dispatch_first_inspector_v1";

function normalizeId(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function sanitizeContinuityMap(
  raw: unknown,
  validInspectorIds: Set<string>
): Record<string, string> {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [workIdRaw, inspectorIdRaw] of Object.entries(raw as Record<string, unknown>)) {
    const workId = normalizeId(workIdRaw);
    const inspectorId = normalizeId(inspectorIdRaw);
    if (!workId || !inspectorId || !validInspectorIds.has(inspectorId)) {
      continue;
    }
    result[workId] = inspectorId;
  }

  return result;
}

export function loadContinuityInspectorMap(inspectorIds: string[]): Record<string, string> {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(CONTINUITY_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return sanitizeContinuityMap(parsed, new Set(inspectorIds));
  } catch {
    return {};
  }
}

export function saveContinuityInspectorMap(
  value: Record<string, string>,
  inspectorIds: string[]
): void {
  if (typeof window === "undefined") {
    return;
  }

  const sanitized = sanitizeContinuityMap(value, new Set(inspectorIds));
  window.localStorage.setItem(CONTINUITY_STORAGE_KEY, JSON.stringify(sanitized));
}

export function registerFirstAssignedInspectors(
  previous: Record<string, string>,
  visitsByInspector: Record<string, PlannedVisit[]>,
  inspectorIds: string[]
): { nextMap: Record<string, string>; added: number } {
  const validInspectorIds = new Set(inspectorIds);
  const nextMap = sanitizeContinuityMap(previous, validInspectorIds);
  let added = 0;

  for (const [inspectorId, visits] of Object.entries(visitsByInspector)) {
    if (!validInspectorIds.has(inspectorId)) {
      continue;
    }

    for (const visit of visits) {
      const workId = normalizeId(visit.work.id);
      if (!workId || nextMap[workId]) {
        continue;
      }
      nextMap[workId] = inspectorId;
      added += 1;
    }
  }

  return { nextMap, added };
}
