import { describe, expect, it } from "vitest";
import { MockNotificationsGateway } from "./MockNotificationsGateway";

describe("MockNotificationsGateway", () => {
  it("returns deterministic taxonomy lists", async () => {
    const gateway = new MockNotificationsGateway();

    const [types, categories, statuses] = await Promise.all([
      gateway.getNotificationTypes(),
      gateway.getNotificationCategories(),
      gateway.getNotificationStatuses(),
    ]);

    expect(types.length).toBeGreaterThan(0);
    expect(categories.length).toBeGreaterThan(0);
    expect(statuses.length).toBeGreaterThan(0);
  });

  it("supports search filters and pagination", async () => {
    const gateway = new MockNotificationsGateway();
    const result = await gateway.searchNotifications({
      notificationCategoryIds: ["cat-task"],
      limit: 1,
      offset: 0,
    });

    expect(result.items).toHaveLength(1);
    expect(result.totalItems).toBeGreaterThanOrEqual(1);
    expect(result.items[0].notificationCategoryId).toBe("cat-task");
  });

  it("supports label-based filters for status, type and category", async () => {
    const gateway = new MockNotificationsGateway();
    const result = await gateway.searchNotifications({
      statusLabels: ["nieuw"],
      notificationTypeLabels: ["expiry warning"],
      notificationCategoryLabels: ["warning"],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].statusLabel).toBe("Nieuw");
    expect(result.items[0].notificationTypeLabel).toBe("Expiry warning");
    expect(result.items[0].notificationCategoryLabel).toBe("Warning");
  });

  it("returns details and updates status in place", async () => {
    const gateway = new MockNotificationsGateway();
    const detail = await gateway.getNotificationDetail("notif-1001");
    expect(detail).not.toBeNull();

    const update = await gateway.updateNotificationStatus({
      notificationId: "notif-1001",
      statusId: "status-done",
    });
    expect(update.ok).toBe(true);
    expect(update.statusId).toBe("status-done");

    const updatedDetail = await gateway.getNotificationDetail("notif-1001");
    expect(updatedDetail?.statusId).toBe("status-done");
    expect(updatedDetail?.isActionRequired).toBe(false);
  });
});
