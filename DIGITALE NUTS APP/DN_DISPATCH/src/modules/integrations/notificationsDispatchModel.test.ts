import { describe, expect, it } from "vitest";
import type { WorkRecord } from "../../types";
import type { NotificationRecord } from "./contracts";
import { buildDispatchUrgentNotificationItems } from "./notificationsDispatchModel";

function createWork(overrides: Partial<WorkRecord> = {}): WorkRecord {
  return {
    id: "work-1",
    dossierId: "BONU-100",
    bonuNummer: "BONU-100",
    referentieId: "REF-100",
    gipodId: "19170001",
    werftype: "NUTSWERKEN",
    status: "IN EFFECT",
    startDate: "2026-03-20",
    endDate: "2026-03-21",
    postcode: "2000",
    district: "Antwerpen",
    straat: "Teststraat",
    huisnr: "1",
    nutsBedrijf: "Fluvius",
    durationDays: 2,
    location: { lat: 51.2194, lng: 4.4025 },
    locationSource: "exact",
    ...overrides,
  };
}

function createNotification(
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
    gipodId: "19170001",
    resourceUrl: "https://example.test/resource",
    isActionRequired: true,
    data: {},
    source: "mock",
    ...overrides,
  };
}

describe("buildDispatchUrgentNotificationItems", () => {
  it("filters closed notifications and prioritizes task/warning items", () => {
    const items = buildDispatchUrgentNotificationItems(
      [
        createNotification({
          notificationId: "notif-warning",
          notificationCategoryLabel: "Warning",
          createdOn: "2026-03-20T09:00:00.000Z",
        }),
        createNotification({
          notificationId: "notif-task",
          notificationCategoryLabel: "Task",
          createdOn: "2026-03-20T08:00:00.000Z",
        }),
        createNotification({
          notificationId: "notif-closed",
          notificationCategoryLabel: "Task",
          statusId: "status-done",
          statusLabel: "Afgehandeld",
        }),
      ],
      [createWork()]
    );

    expect(items.map((item) => item.notification.notificationId)).toEqual([
      "notif-task",
      "notif-warning",
    ]);
  });

  it("links notifications to works using gipod or data references", () => {
    const items = buildDispatchUrgentNotificationItems(
      [
        createNotification({
          notificationId: "notif-by-gipod",
          gipodId: "19170001",
        }),
        createNotification({
          notificationId: "notif-by-dossier",
          gipodId: null,
          data: {
            dossierId: "BONU-100",
          },
        }),
      ],
      [createWork()]
    );

    expect(items).toHaveLength(2);
    expect(items[0].linkedWork?.id).toBe("work-1");
    expect(items[1].linkedWork?.id).toBe("work-1");
    expect(items[0].contextSearchTerm).toBe("BONU-100");
  });

  it("returns a usable fallback context token when no linked work exists", () => {
    const items = buildDispatchUrgentNotificationItems(
      [
        createNotification({
          notificationId: "notif-no-link",
          gipodId: null,
          data: {},
        }),
      ],
      []
    );

    expect(items[0].linkedWork).toBeNull();
    expect(items[0].contextSearchTerm).toBe("notif-no-link");
  });
});
