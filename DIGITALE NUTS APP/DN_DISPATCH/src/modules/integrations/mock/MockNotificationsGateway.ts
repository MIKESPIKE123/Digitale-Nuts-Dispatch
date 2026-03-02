import type {
  IntegrationMode,
  NotificationRecord,
  NotificationsGateway,
  NotificationSearchQuery,
  NotificationSearchResult,
  NotificationStatusUpdateCommand,
  NotificationStatusUpdateResult,
  NotificationTaxonomyEntry,
} from "../contracts";

const MOCK_TYPES: NotificationTaxonomyEntry[] = [
  {
    id: "ntf-assignment-updated",
    label: "Assignment updated",
    description: "Toewijzing of planning van inname is gewijzigd.",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
  {
    id: "ntf-expiry-warning",
    label: "Expiry warning",
    description: "Inname loopt bijna af.",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
];

const MOCK_CATEGORIES: NotificationTaxonomyEntry[] = [
  {
    id: "cat-information",
    label: "Information",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
  {
    id: "cat-warning",
    label: "Warning",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
  {
    id: "cat-task",
    label: "Task",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
];

const MOCK_STATUSES: NotificationTaxonomyEntry[] = [
  {
    id: "status-new",
    label: "Nieuw",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
  {
    id: "status-in-progress",
    label: "In behandeling",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
  {
    id: "status-done",
    label: "Afgehandeld",
    source: "mock",
    updatedAt: "2026-02-28T10:00:00.000Z",
  },
];

const MOCK_NOTIFICATIONS: NotificationRecord[] = [
  {
    notificationId: "notif-1001",
    createdOn: "2026-02-28T08:00:00.000Z",
    expiresOn: "2026-03-01T08:00:00.000Z",
    statusId: "status-new",
    statusLabel: "Nieuw",
    notificationTypeId: "ntf-assignment-updated",
    notificationTypeLabel: "Assignment updated",
    notificationCategoryId: "cat-task",
    notificationCategoryLabel: "Task",
    triggerOrganizationName: "Athumi",
    gipodId: "19230011",
    resourceUrl: "https://gipod.vlaanderen.be/inname/19230011",
    isActionRequired: true,
    data: {
      workReference: "GIPOD-19230011",
      district: "Antwerpen",
    },
    source: "mock",
  },
  {
    notificationId: "notif-1002",
    createdOn: "2026-02-28T09:00:00.000Z",
    expiresOn: null,
    statusId: "status-new",
    statusLabel: "Nieuw",
    notificationTypeId: "ntf-expiry-warning",
    notificationTypeLabel: "Expiry warning",
    notificationCategoryId: "cat-warning",
    notificationCategoryLabel: "Warning",
    triggerOrganizationName: "Athumi",
    gipodId: "19230012",
    resourceUrl: "https://gipod.vlaanderen.be/inname/19230012",
    isActionRequired: true,
    data: {
      workReference: "GIPOD-19230012",
      district: "Borgerhout",
    },
    source: "mock",
  },
];

function normalizeLabel(value: string): string {
  return value.trim().toLocaleLowerCase("nl-BE");
}

function cloneNotification(item: NotificationRecord): NotificationRecord {
  return {
    ...item,
    data: { ...item.data },
  };
}

function matchesLabelFilter(value: string, labels?: string[]): boolean {
  if (!labels || labels.length === 0) {
    return true;
  }
  const wanted = new Set(labels.map((label) => normalizeLabel(label)).filter(Boolean));
  if (wanted.size === 0) {
    return true;
  }
  return wanted.has(normalizeLabel(value));
}

export class MockNotificationsGateway implements NotificationsGateway {
  readonly name = "MockNotificationsGateway";
  readonly mode: IntegrationMode = "mock";
  private readonly records: NotificationRecord[];

  constructor() {
    this.records = MOCK_NOTIFICATIONS.map(cloneNotification);
  }

  async getNotificationTypes(): Promise<NotificationTaxonomyEntry[]> {
    return MOCK_TYPES.map((item) => ({ ...item }));
  }

  async getNotificationCategories(): Promise<NotificationTaxonomyEntry[]> {
    return MOCK_CATEGORIES.map((item) => ({ ...item }));
  }

  async getNotificationStatuses(): Promise<NotificationTaxonomyEntry[]> {
    return MOCK_STATUSES.map((item) => ({ ...item }));
  }

  async searchNotifications(query: NotificationSearchQuery): Promise<NotificationSearchResult> {
    const limit = typeof query.limit === "number" && query.limit > 0 ? query.limit : 50;
    const offset = typeof query.offset === "number" && query.offset >= 0 ? query.offset : 0;
    const createdOnStart = query.createdOnStart ? Date.parse(query.createdOnStart) : null;
    const createdOnEnd = query.createdOnEnd ? Date.parse(query.createdOnEnd) : null;

    const filtered = this.records.filter((item) => {
      if (
        query.statusIds &&
        query.statusIds.length > 0 &&
        !query.statusIds.includes(item.statusId)
      ) {
        return false;
      }
      if (!matchesLabelFilter(item.statusLabel, query.statusLabels)) {
        return false;
      }

      if (
        query.notificationTypeIds &&
        query.notificationTypeIds.length > 0 &&
        !query.notificationTypeIds.includes(item.notificationTypeId)
      ) {
        return false;
      }
      if (!matchesLabelFilter(item.notificationTypeLabel, query.notificationTypeLabels)) {
        return false;
      }

      if (
        query.notificationCategoryIds &&
        query.notificationCategoryIds.length > 0 &&
        !query.notificationCategoryIds.includes(item.notificationCategoryId)
      ) {
        return false;
      }
      if (
        !matchesLabelFilter(item.notificationCategoryLabel, query.notificationCategoryLabels)
      ) {
        return false;
      }

      const createdOnTime = Date.parse(item.createdOn);
      if (createdOnStart !== null && Number.isFinite(createdOnStart) && createdOnTime < createdOnStart) {
        return false;
      }

      if (createdOnEnd !== null && Number.isFinite(createdOnEnd) && createdOnTime > createdOnEnd) {
        return false;
      }

      return true;
    });

    const paged = filtered.slice(offset, offset + limit).map(cloneNotification);
    return {
      items: paged,
      totalItems: filtered.length,
      hasNextPage: offset + paged.length < filtered.length,
    };
  }

  async getNotificationDetail(notificationId: string): Promise<NotificationRecord | null> {
    const found = this.records.find((item) => item.notificationId === notificationId);
    return found ? cloneNotification(found) : null;
  }

  async updateNotificationStatus(
    command: NotificationStatusUpdateCommand
  ): Promise<NotificationStatusUpdateResult> {
    const target = this.records.find((item) => item.notificationId === command.notificationId);
    if (!target) {
      return {
        ok: false,
        statusCode: 404,
        error: "Notification not found in mock data.",
        source: "mock",
      };
    }

    const nextStatus = MOCK_STATUSES.find((status) => status.id === command.statusId);
    target.statusId = command.statusId;
    target.statusLabel = nextStatus?.label ?? command.statusId;
    target.isActionRequired = command.statusId !== "status-done";

    return {
      ok: true,
      statusCode: 200,
      statusId: target.statusId,
      updatedAt: new Date().toISOString(),
      source: "mock",
    };
  }
}
