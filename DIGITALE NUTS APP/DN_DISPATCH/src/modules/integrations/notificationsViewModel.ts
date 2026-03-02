import type { NotificationRecord, NotificationTaxonomyEntry } from "./contracts";

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase("nl-BE");
}

function isClosedStatus(statusId: string, statusLabel: string): boolean {
  const id = normalizeText(statusId);
  const label = normalizeText(statusLabel);
  return (
    id.includes("done") ||
    id.includes("closed") ||
    label.includes("afgehandeld") ||
    label.includes("closed") ||
    label.includes("done")
  );
}

function shouldRequireAction(
  record: NotificationRecord,
  statusId: string,
  statusLabel: string
): boolean {
  if (isClosedStatus(statusId, statusLabel)) {
    return false;
  }

  const category = normalizeText(record.notificationCategoryLabel);
  if (category.includes("task") || category.includes("warning")) {
    return true;
  }

  return record.isActionRequired;
}

function toSortableTimestamp(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sortNotificationsByCreatedOnDesc(
  records: NotificationRecord[]
): NotificationRecord[] {
  return [...records].sort(
    (left, right) =>
      toSortableTimestamp(right.createdOn) - toSortableTimestamp(left.createdOn)
  );
}

export function buildNotificationStatusLookup(
  statuses: NotificationTaxonomyEntry[]
): Record<string, string> {
  const map: Record<string, string> = {};
  for (const item of statuses) {
    if (!item.id) {
      continue;
    }
    map[item.id] = item.label || item.id;
  }
  return map;
}

export function buildNotificationStatusDraftMap(
  records: NotificationRecord[],
  previousDraftById: Record<string, string> = {}
): Record<string, string> {
  const next: Record<string, string> = {};
  for (const item of records) {
    const previous = (previousDraftById[item.notificationId] ?? "").trim();
    next[item.notificationId] = previous || item.statusId;
  }
  return next;
}

export function applyNotificationStatusUpdate(
  records: NotificationRecord[],
  notificationId: string,
  nextStatusId: string,
  statusLookup: Record<string, string>
): NotificationRecord[] {
  return records.map((item) => {
    if (item.notificationId !== notificationId) {
      return item;
    }

    const statusLabel = statusLookup[nextStatusId] ?? nextStatusId;
    return {
      ...item,
      statusId: nextStatusId,
      statusLabel,
      isActionRequired: shouldRequireAction(item, nextStatusId, statusLabel),
    };
  });
}
