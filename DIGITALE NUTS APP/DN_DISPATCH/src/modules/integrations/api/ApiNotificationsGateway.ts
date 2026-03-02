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

type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ApiNotificationsGatewayOptions = {
  baseUrl?: string;
  bearerToken?: string;
  timeoutMs?: number;
  fetchFn?: FetchFn;
};

const DEFAULT_TIMEOUT_MS = 15000;

class NotificationsHttpError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "NotificationsHttpError";
    this.statusCode = statusCode;
  }
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeLabel(value: string): string {
  return normalizeText(value).toLocaleLowerCase("nl-BE");
}

function parseIsoOrNow(value: unknown): string {
  const text = normalizeText(value);
  return text && !Number.isNaN(Date.parse(text)) ? text : new Date().toISOString();
}

function toArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object" && Array.isArray((value as { member?: unknown[] }).member)) {
    return (value as { member: unknown[] }).member;
  }
  return [];
}

function parseTaxonomyEntry(item: unknown): NotificationTaxonomyEntry | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as Record<string, unknown>;
  const id = normalizeText(row.id ?? row.identifier ?? row.uri);
  if (!id) {
    return null;
  }

  const label = normalizeText(row.prefLabel ?? row.label ?? row.name) || id;
  const description = normalizeText(row.definition ?? row.description ?? "");
  const updatedAt = parseIsoOrNow(row.lastModifiedOn ?? row.modifiedOn ?? row.updatedAt);

  return {
    id,
    label,
    description: description || undefined,
    source: "api",
    updatedAt,
  };
}

function extractDataMap(item: Record<string, unknown>): Record<string, string> {
  const rawData = item.data;
  if (!rawData) {
    return {};
  }

  if (Array.isArray(rawData)) {
    const mapped: Record<string, string> = {};
    for (const entry of rawData) {
      if (!entry || typeof entry !== "object") {
        continue;
      }
      const row = entry as Record<string, unknown>;
      const key = normalizeText(row.key ?? row.name ?? row.code);
      const value = normalizeText(row.value ?? row.label ?? row.prefLabel);
      if (key && value) {
        mapped[key] = value;
      }
    }
    return mapped;
  }

  if (typeof rawData === "object") {
    return Object.entries(rawData as Record<string, unknown>).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        const normalizedValue = normalizeText(value);
        if (normalizedValue) {
          accumulator[key] = normalizedValue;
        }
        return accumulator;
      },
      {}
    );
  }

  return {};
}

function buildTaxonomyMap(entries: NotificationTaxonomyEntry[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const item of entries) {
    map.set(item.id, item.label);
  }
  return map;
}

function getIdFromRecord(record: Record<string, unknown>, key: string): string {
  const direct = normalizeText(record[key]);
  if (direct) {
    return direct;
  }

  const nested = record[key];
  if (nested && typeof nested === "object") {
    return normalizeText((nested as Record<string, unknown>).id ?? (nested as Record<string, unknown>).identifier);
  }

  return "";
}

function getLabelFromRecord(record: Record<string, unknown>, key: string): string {
  const nested = record[key];
  if (nested && typeof nested === "object") {
    return normalizeText(
      (nested as Record<string, unknown>).prefLabel ??
        (nested as Record<string, unknown>).label ??
        (nested as Record<string, unknown>).name
    );
  }
  return normalizeText(record[`${key}Label`]);
}

function parseNotificationRecord(
  item: unknown,
  statusLabels: Map<string, string>,
  typeLabels: Map<string, string>,
  categoryLabels: Map<string, string>
): NotificationRecord | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const row = item as Record<string, unknown>;
  const notificationId = normalizeText(row.notificationId ?? row.id);
  if (!notificationId) {
    return null;
  }

  const statusId = getIdFromRecord(row, "status") || normalizeText(row.statusId) || "unknown-status";
  const typeId =
    getIdFromRecord(row, "notificationType") ||
    normalizeText(row.notificationTypeId) ||
    "unknown-type";
  const categoryId =
    getIdFromRecord(row, "notificationCategory") ||
    normalizeText(row.notificationCategoryId) ||
    "unknown-category";

  const statusLabel =
    getLabelFromRecord(row, "status") || statusLabels.get(statusId) || statusId;
  const typeLabel =
    getLabelFromRecord(row, "notificationType") || typeLabels.get(typeId) || typeId;
  const categoryLabel =
    getLabelFromRecord(row, "notificationCategory") || categoryLabels.get(categoryId) || categoryId;

  const data = extractDataMap(row);
  const gipodId = normalizeText(row.gipodId) || normalizeText(data.gipodId) || null;
  const resourceUrl = normalizeText(row.resourceUrl) || normalizeText(data.resourceUrl) || null;
  const triggerOrganizationName =
    normalizeText(row.triggerOrganizationName) ||
    normalizeText((row.triggeringOrganization as Record<string, unknown> | undefined)?.preferredName) ||
    null;

  const categoryLabelNormalized = normalizeLabel(categoryLabel);
  const isActionRequired =
    categoryLabelNormalized.includes("task") ||
    categoryLabelNormalized.includes("warning") ||
    statusId.toLocaleLowerCase("nl-BE").includes("new");

  return {
    notificationId,
    createdOn: parseIsoOrNow(row.createdOn),
    expiresOn: normalizeText(row.expiresOn) || null,
    statusId,
    statusLabel,
    notificationTypeId: typeId,
    notificationTypeLabel: typeLabel,
    notificationCategoryId: categoryId,
    notificationCategoryLabel: categoryLabel,
    triggerOrganizationName,
    gipodId,
    resourceUrl,
    isActionRequired,
    data,
    source: "api",
  };
}

function parseTotalItems(payload: unknown, fallbackLength: number): number | null {
  if (!payload || typeof payload !== "object") {
    return fallbackLength;
  }
  const value = Number((payload as Record<string, unknown>).totalItems);
  return Number.isFinite(value) ? value : fallbackLength;
}

function parseHasNextPage(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }
  const view = (payload as Record<string, unknown>).view;
  if (!view || typeof view !== "object") {
    return false;
  }
  return Boolean((view as Record<string, unknown>).next);
}

function readEnvValue(key: string): string {
  const envBag = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return normalizeText(envBag?.[key]);
}

function resolveStatusIdsByLabels(
  requestedLabels: string[] | undefined,
  entries: NotificationTaxonomyEntry[]
): string[] {
  if (!requestedLabels || requestedLabels.length === 0) {
    return [];
  }
  const requested = new Set(requestedLabels.map((label) => normalizeLabel(label)).filter(Boolean));
  return entries
    .filter((entry) => requested.has(normalizeLabel(entry.label)))
    .map((entry) => entry.id);
}

function appendMultiValueParams(params: URLSearchParams, key: string, values: string[] | undefined): void {
  if (!values || values.length === 0) {
    return;
  }
  for (const value of values) {
    const clean = normalizeText(value);
    if (clean) {
      params.append(key, clean);
    }
  }
}

export class ApiNotificationsGateway implements NotificationsGateway {
  readonly name = "ApiNotificationsGateway";
  readonly mode: IntegrationMode = "api";
  private readonly baseUrl: string;
  private readonly bearerToken: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: FetchFn;

  constructor(options: ApiNotificationsGatewayOptions = {}) {
    this.baseUrl =
      normalizeText(options.baseUrl) ||
      readEnvValue("VITE_GIPOD_NOTIFICATIONS_BASE_URL") ||
      readEnvValue("VITE_GIPOD_BASE_URL");
    this.bearerToken =
      normalizeText(options.bearerToken) ||
      readEnvValue("VITE_GIPOD_NOTIFICATIONS_BEARER_TOKEN") ||
      readEnvValue("VITE_GIPOD_BEARER_TOKEN");
    this.timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
    this.fetchFn = options.fetchFn ?? fetch;
  }

  private isConfigured(): boolean {
    return Boolean(this.baseUrl && this.bearerToken);
  }

  private async requestJson(path: string, query?: URLSearchParams): Promise<unknown | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const url = new URL(path, this.baseUrl);
    if (query) {
      for (const [key, value] of query.entries()) {
        url.searchParams.append(key, value);
      }
    }

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${this.bearerToken}`,
        },
        signal: controller.signal,
      });

      if (response.status === 429 || response.status === 401 || response.status === 403) {
        throw new NotificationsHttpError(
          response.status,
          `HTTP ${response.status} bij notificatie-opvraging.`
        );
      }

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof NotificationsHttpError) {
        throw error;
      }
      return null;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  private async loadTaxonomy(path: string): Promise<NotificationTaxonomyEntry[]> {
    const payload = await this.requestJson(path);
    return toArray(payload).map(parseTaxonomyEntry).filter((item): item is NotificationTaxonomyEntry => Boolean(item));
  }

  async getNotificationTypes(): Promise<NotificationTaxonomyEntry[]> {
    return this.loadTaxonomy("/api/v1/taxonomies/notificationtypes");
  }

  async getNotificationCategories(): Promise<NotificationTaxonomyEntry[]> {
    return this.loadTaxonomy("/api/v1/taxonomies/notification-categories");
  }

  async getNotificationStatuses(): Promise<NotificationTaxonomyEntry[]> {
    return this.loadTaxonomy("/api/v1/taxonomies/statuses");
  }

  async searchNotifications(query: NotificationSearchQuery): Promise<NotificationSearchResult> {
    if (!this.isConfigured()) {
      return {
        items: [],
        totalItems: 0,
        hasNextPage: false,
      };
    }

    const [statuses, types, categories] = await Promise.all([
      this.getNotificationStatuses(),
      this.getNotificationTypes(),
      this.getNotificationCategories(),
    ]);

    const statusIdsByLabel = resolveStatusIdsByLabels(query.statusLabels, statuses);
    const typeIdsByLabel = resolveStatusIdsByLabels(query.notificationTypeLabels, types);
    const categoryIdsByLabel = resolveStatusIdsByLabels(
      query.notificationCategoryLabels,
      categories
    );

    const params = new URLSearchParams();
    appendMultiValueParams(params, "statusId", [...(query.statusIds ?? []), ...statusIdsByLabel]);
    appendMultiValueParams(params, "notificationTypeId", [
      ...(query.notificationTypeIds ?? []),
      ...typeIdsByLabel,
    ]);
    appendMultiValueParams(params, "notificationCategoryId", [
      ...(query.notificationCategoryIds ?? []),
      ...categoryIdsByLabel,
    ]);

    const createdOnStart = normalizeText(query.createdOnStart);
    const createdOnEnd = normalizeText(query.createdOnEnd);
    if (createdOnStart) {
      params.set("createdOn.start", createdOnStart);
    }
    if (createdOnEnd) {
      params.set("createdOn.end", createdOnEnd);
    }
    if (typeof query.limit === "number" && query.limit > 0) {
      params.set("limit", String(query.limit));
    }
    if (typeof query.offset === "number" && query.offset >= 0) {
      params.set("offset", String(query.offset));
    }

    const payload = await this.requestJson("/api/v1/notifications", params);
    const statusLabelMap = buildTaxonomyMap(statuses);
    const typeLabelMap = buildTaxonomyMap(types);
    const categoryLabelMap = buildTaxonomyMap(categories);
    const items = toArray(payload)
      .map((item) => parseNotificationRecord(item, statusLabelMap, typeLabelMap, categoryLabelMap))
      .filter((item): item is NotificationRecord => Boolean(item));

    return {
      items,
      totalItems: parseTotalItems(payload, items.length),
      hasNextPage: parseHasNextPage(payload),
    };
  }

  async getNotificationDetail(notificationId: string): Promise<NotificationRecord | null> {
    if (!this.isConfigured()) {
      return null;
    }

    const cleanId = normalizeText(notificationId);
    if (!cleanId) {
      return null;
    }

    const [statuses, types, categories, payload] = await Promise.all([
      this.getNotificationStatuses(),
      this.getNotificationTypes(),
      this.getNotificationCategories(),
      this.requestJson(`/api/v1/notifications/${encodeURIComponent(cleanId)}`),
    ]);

    return parseNotificationRecord(
      payload,
      buildTaxonomyMap(statuses),
      buildTaxonomyMap(types),
      buildTaxonomyMap(categories)
    );
  }

  async updateNotificationStatus(
    command: NotificationStatusUpdateCommand
  ): Promise<NotificationStatusUpdateResult> {
    if (!this.isConfigured()) {
      return {
        ok: false,
        statusCode: 501,
        error: "Notifications update endpoint not configured.",
        source: "api",
      };
    }

    const notificationId = normalizeText(command.notificationId);
    const statusId = normalizeText(command.statusId);
    if (!notificationId || !statusId) {
      return {
        ok: false,
        statusCode: 400,
        error: "notificationId en statusId zijn verplicht.",
        source: "api",
      };
    }

    const url = new URL(`/api/v1/notifications/${encodeURIComponent(notificationId)}`, this.baseUrl);
    const body = {
      statusId,
      comment: normalizeText(command.comment) || undefined,
      actorId: normalizeText(command.actorId) || undefined,
    };

    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${this.bearerToken}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const parsed = response.headers
        .get("content-type")
        ?.toLowerCase()
        .includes("application/json")
        ? ((await response.json()) as Record<string, unknown>)
        : null;

      if (!response.ok) {
        return {
          ok: false,
          statusCode: response.status,
          error:
            normalizeText(parsed?.error) ||
            normalizeText((parsed?.error as Record<string, unknown> | undefined)?.message) ||
            `HTTP ${response.status}`,
          source: "api",
        };
      }

      return {
        ok: true,
        statusCode: response.status,
        statusId: normalizeText(parsed?.statusId) || statusId,
        updatedAt: parseIsoOrNow(parsed?.updatedAt ?? parsed?.lastModifiedOn),
        source: "api",
      };
    } catch (error) {
      return {
        ok: false,
        statusCode: 0,
        error: error instanceof Error ? error.message : "Onbekende notificatie-update fout.",
        source: "api",
      };
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }
}
