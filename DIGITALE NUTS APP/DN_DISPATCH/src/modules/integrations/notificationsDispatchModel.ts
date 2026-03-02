import type { WorkRecord } from "../../types";
import type { NotificationRecord } from "./contracts";

export interface DispatchNotificationContextItem {
  notification: NotificationRecord;
  linkedWork: WorkRecord | null;
  contextSearchTerm: string;
}

function normalizeValue(value: string): string {
  return value.trim().toLocaleLowerCase("nl-BE");
}

function toSortableTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isClosedStatus(statusId: string, statusLabel: string): boolean {
  const id = normalizeValue(statusId);
  const label = normalizeValue(statusLabel);
  return (
    id.includes("done") ||
    id.includes("closed") ||
    label.includes("afgehandeld") ||
    label.includes("closed") ||
    label.includes("done")
  );
}

function isUrgentCategory(categoryLabel: string): boolean {
  const normalized = normalizeValue(categoryLabel);
  return normalized.includes("task") || normalized.includes("warning");
}

function buildWorkLookup(works: WorkRecord[]): Map<string, WorkRecord> {
  const lookup = new Map<string, WorkRecord>();

  const register = (key: string, work: WorkRecord): void => {
    const normalized = normalizeValue(key);
    if (!normalized || lookup.has(normalized)) {
      return;
    }
    lookup.set(normalized, work);
  };

  for (const work of works) {
    register(work.id, work);
    register(work.dossierId, work);
    register(work.referentieId, work);
    register(work.bonuNummer, work);
    register(work.gipodId, work);
  }

  return lookup;
}

function extractNotificationCandidates(record: NotificationRecord): string[] {
  const values = new Set<string>();

  const addCandidate = (value: string | null | undefined): void => {
    if (!value) {
      return;
    }
    const clean = value.trim();
    if (!clean) {
      return;
    }
    values.add(clean);
  };

  addCandidate(record.gipodId);
  addCandidate(record.notificationId);
  addCandidate(record.resourceUrl);

  for (const [key, value] of Object.entries(record.data)) {
    if (!value) {
      continue;
    }
    const normalizedKey = normalizeValue(key);
    if (
      normalizedKey.includes("gipod") ||
      normalizedKey.includes("dossier") ||
      normalizedKey.includes("referentie") ||
      normalizedKey.includes("reference") ||
      normalizedKey.includes("bonu") ||
      normalizedKey.includes("work")
    ) {
      addCandidate(value);
    }
  }

  return Array.from(values.values());
}

function findLinkedWork(
  record: NotificationRecord,
  lookup: Map<string, WorkRecord>
): WorkRecord | null {
  const candidates = extractNotificationCandidates(record);
  for (const candidate of candidates) {
    const direct = lookup.get(normalizeValue(candidate));
    if (direct) {
      return direct;
    }

    const digitsOnly = candidate.replace(/\D/g, "");
    if (digitsOnly) {
      const fromDigits = lookup.get(normalizeValue(digitsOnly));
      if (fromDigits) {
        return fromDigits;
      }
    }
  }

  return null;
}

function getUrgencyScore(record: NotificationRecord): number {
  const category = normalizeValue(record.notificationCategoryLabel);
  const taskBoost = category.includes("task") ? 200 : 0;
  const warningBoost = category.includes("warning") ? 120 : 0;
  const actionBoost = record.isActionRequired ? 80 : 0;
  return taskBoost + warningBoost + actionBoost;
}

function buildContextSearchTerm(
  record: NotificationRecord,
  linkedWork: WorkRecord | null
): string {
  if (linkedWork) {
    return linkedWork.dossierId;
  }

  return (
    record.gipodId ||
    record.data.workReference ||
    record.data.dossierId ||
    record.data.referentieId ||
    record.notificationId
  );
}

export function buildDispatchUrgentNotificationItems(
  records: NotificationRecord[],
  works: WorkRecord[],
  limit = 6
): DispatchNotificationContextItem[] {
  const lookup = buildWorkLookup(works);
  const urgent = records.filter((record) => {
    if (isClosedStatus(record.statusId, record.statusLabel)) {
      return false;
    }
    return isUrgentCategory(record.notificationCategoryLabel) || record.isActionRequired;
  });

  return urgent
    .map((record) => {
      const linkedWork = findLinkedWork(record, lookup);
      return {
        notification: record,
        linkedWork,
        contextSearchTerm: buildContextSearchTerm(record, linkedWork),
      };
    })
    .sort((left, right) => {
      const scoreDiff =
        getUrgencyScore(right.notification) - getUrgencyScore(left.notification);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
      return (
        toSortableTimestamp(right.notification.createdOn) -
        toSortableTimestamp(left.notification.createdOn)
      );
    })
    .slice(0, Math.max(1, limit));
}
