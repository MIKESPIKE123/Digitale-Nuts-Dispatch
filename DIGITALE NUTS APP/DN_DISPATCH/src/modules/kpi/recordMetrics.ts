import { addDays, formatIsoDate, parseIsoDate } from "../../lib/dateUtils";
import { calculateChecklistScore } from "../vaststelling/checklistScore";
import type { DNVaststellingFieldValue, DNVaststellingRecord } from "../vaststelling/contracts";

export function getIsoWeekBounds(referenceIso: string): { startIso: string; endIso: string } {
  const referenceDate = parseIsoDate(referenceIso);
  const dayIndex = (referenceDate.getDay() + 6) % 7;
  const start = addDays(referenceDate, -dayIndex);
  const end = addDays(start, 6);
  return {
    startIso: formatIsoDate(start),
    endIso: formatIsoDate(end),
  };
}

export function getRecordDateKey(record: DNVaststellingRecord): string {
  const plannedDate = (record.immutableContext.plannedVisitDate || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(plannedDate)) {
    return plannedDate;
  }

  const createdDate = (record.createdAt || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(createdDate)) {
    return createdDate;
  }

  return "";
}

function getRecordFormData(
  record: DNVaststellingRecord
): Record<string, DNVaststellingFieldValue> {
  const raw = record.mutablePayload.formData;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const parsed: Record<string, DNVaststellingFieldValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      parsed[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      parsed[key] = value;
    }
  }

  return parsed;
}

export function resolveRecordChecklistScore(record: DNVaststellingRecord): number {
  const rawScore = record.mutablePayload.checklistScore;
  if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }
  return calculateChecklistScore(getRecordFormData(record)).score;
}
