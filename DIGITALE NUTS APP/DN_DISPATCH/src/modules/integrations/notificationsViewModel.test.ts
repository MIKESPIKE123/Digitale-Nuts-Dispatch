import { describe, expect, it } from "vitest";
import type { NotificationRecord, NotificationTaxonomyEntry } from "./contracts";
import {
  applyNotificationStatusUpdate,
  buildNotificationStatusDraftMap,
  buildNotificationStatusLookup,
  sortNotificationsByCreatedOnDesc,
} from "./notificationsViewModel";

function createRecord(
  overrides: Partial<NotificationRecord> = {}
): NotificationRecord {
  return {
    notificationId: "notif-1",
    createdOn: "2026-03-20T08:00:00.000Z",
    expiresOn: null,
    statusId: "status-new",
    statusLabel: "Nieuw",
    notificationTypeId: "type-1",
    notificationTypeLabel: "Assignment updated",
    notificationCategoryId: "cat-task",
    notificationCategoryLabel: "Task",
    triggerOrganizationName: "Athumi",
    gipodId: "1001",
    resourceUrl: "https://example.test/notif-1",
    isActionRequired: true,
    data: {},
    source: "mock",
    ...overrides,
  };
}

describe("notificationsViewModel", () => {
  it("sorts notifications on createdOn descending", () => {
    const sorted = sortNotificationsByCreatedOnDesc([
      createRecord({
        notificationId: "notif-old",
        createdOn: "2026-03-19T08:00:00.000Z",
      }),
      createRecord({
        notificationId: "notif-new",
        createdOn: "2026-03-20T09:30:00.000Z",
      }),
    ]);

    expect(sorted.map((item) => item.notificationId)).toEqual([
      "notif-new",
      "notif-old",
    ]);
  });

  it("builds a status lookup and preserves existing draft selections", () => {
    const statuses: NotificationTaxonomyEntry[] = [
      {
        id: "status-new",
        label: "Nieuw",
        source: "mock",
        updatedAt: "2026-03-20T08:00:00.000Z",
      },
      {
        id: "status-done",
        label: "Afgehandeld",
        source: "mock",
        updatedAt: "2026-03-20T08:00:00.000Z",
      },
    ];

    const lookup = buildNotificationStatusLookup(statuses);
    expect(lookup["status-done"]).toBe("Afgehandeld");

    const draftMap = buildNotificationStatusDraftMap(
      [createRecord({ notificationId: "notif-1", statusId: "status-new" })],
      { "notif-1": "status-done" }
    );
    expect(draftMap["notif-1"]).toBe("status-done");
  });

  it("applies a local status update and clears action-required for closed statuses", () => {
    const updated = applyNotificationStatusUpdate(
      [createRecord({ notificationId: "notif-1", statusId: "status-new" })],
      "notif-1",
      "status-done",
      { "status-done": "Afgehandeld" }
    );

    expect(updated[0].statusId).toBe("status-done");
    expect(updated[0].statusLabel).toBe("Afgehandeld");
    expect(updated[0].isActionRequired).toBe(false);
  });
});
