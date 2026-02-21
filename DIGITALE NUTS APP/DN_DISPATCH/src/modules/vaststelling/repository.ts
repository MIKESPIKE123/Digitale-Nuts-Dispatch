import type {
  ActiveInspectorSession,
  DNVaststellingRecord,
  DNVaststellingSyncItem,
  DNVaststellingSyncSettings,
} from "./contracts";
import type { Inspector } from "../../types";

export const ACTIVE_INSPECTOR_SESSION_KEY = "dn_active_inspector_session_v1";
export const DN_VASTSTELLING_RECORDS_KEY = "dn_vaststelling_records_v1";
export const DN_VASTSTELLING_SYNC_QUEUE_KEY = "dn_vaststelling_sync_queue_v1";
export const DN_VASTSTELLING_SYNC_SETTINGS_KEY = "dn_vaststelling_sync_settings_v1";
export const DN_VASTSTELLING_IDB_NAME = "dn_vaststelling_db_v1";
export const DN_VASTSTELLING_IDB_STORE = "kv";

export const DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS: DNVaststellingSyncSettings = {
  endpoint: "/api/inspecties/sync",
  autoSyncOnOnline: true,
  requestTimeoutMs: 15000,
};

export interface VaststellingRepository {
  readonly name: string;
  readonly mode: "indexeddb" | "localstorage";
  loadActiveInspectorSession(inspectors: Inspector[]): Promise<ActiveInspectorSession | null>;
  saveActiveInspectorSession(session: ActiveInspectorSession): Promise<void>;
  clearActiveInspectorSession(): Promise<void>;
  loadDNVaststellingRecords(): Promise<DNVaststellingRecord[]>;
  saveDNVaststellingRecords(records: DNVaststellingRecord[]): Promise<void>;
  loadDNVaststellingSyncQueue(): Promise<DNVaststellingSyncItem[]>;
  saveDNVaststellingSyncQueue(items: DNVaststellingSyncItem[]): Promise<void>;
  loadDNVaststellingSyncSettings(): Promise<DNVaststellingSyncSettings>;
  saveDNVaststellingSyncSettings(settings: DNVaststellingSyncSettings): Promise<void>;
}

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function sanitizeActiveSession(
  raw: unknown,
  validInspectorIds: Set<string>
): ActiveInspectorSession | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const inspectorId = normalizeText(data.inspectorId);
  const inspectorName = normalizeText(data.inspectorName);
  const inspectorInitials = normalizeText(data.inspectorInitials);
  const deviceId = normalizeText(data.deviceId);
  const startedAt = normalizeText(data.startedAt);

  if (!inspectorId || !validInspectorIds.has(inspectorId)) {
    return null;
  }

  if (!inspectorName || !inspectorInitials || !deviceId || !startedAt) {
    return null;
  }

  return {
    inspectorId,
    inspectorName,
    inspectorInitials,
    deviceId,
    startedAt,
    pinValidated: Boolean(data.pinValidated),
  };
}

function sanitizeRecord(raw: unknown): DNVaststellingRecord | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;
  if (typeof data.id !== "string") {
    return null;
  }
  if (
    data.completionState !== "draft" &&
    data.completionState !== "valid" &&
    data.completionState !== "queued" &&
    data.completionState !== "synced"
  ) {
    return null;
  }

  if (!data.inspectorSession || typeof data.inspectorSession !== "object") {
    return null;
  }
  if (!data.immutableContext || typeof data.immutableContext !== "object") {
    return null;
  }
  if (typeof data.createdAt !== "string" || typeof data.updatedAt !== "string") {
    return null;
  }
  if (typeof data.immutableFingerprint !== "string") {
    return null;
  }

  const inspectorSession = data.inspectorSession as Record<string, unknown>;
  const immutableContext = data.immutableContext as Record<string, unknown>;
  const mutablePayload =
    data.mutablePayload && typeof data.mutablePayload === "object"
      ? (data.mutablePayload as Record<string, unknown>)
      : {};

  if (
    typeof inspectorSession.inspectorId !== "string" ||
    typeof inspectorSession.inspectorName !== "string" ||
    typeof inspectorSession.inspectorInitials !== "string" ||
    typeof inspectorSession.deviceId !== "string" ||
    typeof inspectorSession.startedAt !== "string"
  ) {
    return null;
  }

  if (
    typeof immutableContext.workId !== "string" ||
    typeof immutableContext.dossierId !== "string" ||
    (typeof immutableContext.bonuNummer !== "string" &&
      typeof immutableContext.bonuNummer !== "undefined") ||
    typeof immutableContext.referentieId !== "string" ||
    typeof immutableContext.gipodId !== "string" ||
    typeof immutableContext.straat !== "string" ||
    typeof immutableContext.huisnr !== "string" ||
    typeof immutableContext.postcode !== "string" ||
    typeof immutableContext.district !== "string" ||
    typeof immutableContext.nutsBedrijf !== "string" ||
    (immutableContext.locationSource !== "exact" && immutableContext.locationSource !== "postcode") ||
    typeof immutableContext.latitude !== "number" ||
    typeof immutableContext.longitude !== "number" ||
    typeof immutableContext.plannedVisitDate !== "string" ||
    (immutableContext.visitType !== "START" &&
      immutableContext.visitType !== "EIND" &&
      immutableContext.visitType !== "TUSSEN") ||
    typeof immutableContext.assignedInspectorId !== "string" ||
    typeof immutableContext.assignedInspectorName !== "string"
  ) {
    return null;
  }

  return {
    id: data.id,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    completionState: data.completionState,
    inspectorSession: {
      inspectorId: inspectorSession.inspectorId,
      inspectorName: inspectorSession.inspectorName,
      inspectorInitials: inspectorSession.inspectorInitials,
      deviceId: inspectorSession.deviceId,
      startedAt: inspectorSession.startedAt,
      pinValidated: Boolean(inspectorSession.pinValidated),
    },
    immutableContext: {
      workId: immutableContext.workId,
      dossierId: immutableContext.dossierId,
      bonuNummer: typeof immutableContext.bonuNummer === "string" ? immutableContext.bonuNummer : "",
      referentieId: immutableContext.referentieId,
      gipodId: immutableContext.gipodId,
      straat: immutableContext.straat,
      huisnr: immutableContext.huisnr,
      postcode: immutableContext.postcode,
      district: immutableContext.district,
      nutsBedrijf: immutableContext.nutsBedrijf,
      locationSource: immutableContext.locationSource,
      latitude: immutableContext.latitude,
      longitude: immutableContext.longitude,
      plannedVisitDate: immutableContext.plannedVisitDate,
      visitType: immutableContext.visitType,
      assignedInspectorId: immutableContext.assignedInspectorId,
      assignedInspectorName: immutableContext.assignedInspectorName,
    },
    mutablePayload,
    immutableFingerprint: data.immutableFingerprint,
  };
}

function sanitizeSyncItem(raw: unknown): DNVaststellingSyncItem | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const data = raw as Record<string, unknown>;

  if (typeof data.id !== "string") {
    return null;
  }
  if (
    data.type !== "inspection_saved" &&
    data.type !== "handover_decision" &&
    data.type !== "field_photos_added"
  ) {
    return null;
  }

  const status =
    data.status === "queued" || data.status === "synced" || data.status === "failed"
      ? data.status
      : "queued";

  return {
    id: data.id,
    type: data.type,
    status,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    payload: data.payload && typeof data.payload === "object" ? (data.payload as Record<string, unknown>) : {},
    attempts: typeof data.attempts === "number" && Number.isFinite(data.attempts) ? data.attempts : 0,
    lastAttemptAt: typeof data.lastAttemptAt === "string" ? data.lastAttemptAt : undefined,
    syncedAt: typeof data.syncedAt === "string" ? data.syncedAt : undefined,
    lastError: typeof data.lastError === "string" ? data.lastError : undefined,
    responseCode: typeof data.responseCode === "number" ? data.responseCode : undefined,
    serverOutcome:
      data.serverOutcome === "accepted" ||
      data.serverOutcome === "duplicate" ||
      data.serverOutcome === "rejected"
        ? data.serverOutcome
        : undefined,
    serverSyncEventId:
      typeof data.serverSyncEventId === "string" ? data.serverSyncEventId : undefined,
    serverProcessedAt:
      typeof data.serverProcessedAt === "string" ? data.serverProcessedAt : undefined,
    serverMappedStatus:
      data.serverMappedStatus === "planned" ||
      data.serverMappedStatus === "in_progress" ||
      data.serverMappedStatus === "temporary_restore" ||
      data.serverMappedStatus === "closed"
        ? data.serverMappedStatus
        : undefined,
    serverStatusMappingSource:
      typeof data.serverStatusMappingSource === "string"
        ? data.serverStatusMappingSource
        : undefined,
  };
}

function sanitizeSyncSettings(raw: unknown): DNVaststellingSyncSettings {
  if (!raw || typeof raw !== "object") {
    return DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS;
  }

  const data = raw as Record<string, unknown>;
  return {
    endpoint:
      typeof data.endpoint === "string" && data.endpoint.trim().length > 0
        ? data.endpoint.trim()
        : DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS.endpoint,
    autoSyncOnOnline:
      typeof data.autoSyncOnOnline === "boolean"
        ? data.autoSyncOnOnline
        : DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS.autoSyncOnOnline,
    requestTimeoutMs:
      typeof data.requestTimeoutMs === "number" && data.requestTimeoutMs >= 1000
        ? Math.round(data.requestTimeoutMs)
        : DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS.requestTimeoutMs,
  };
}

function sanitizeRecordList(raw: unknown): DNVaststellingRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => sanitizeRecord(item))
    .filter((item): item is DNVaststellingRecord => item !== null);
}

function sanitizeSyncItemList(raw: unknown): DNVaststellingSyncItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => sanitizeSyncItem(item))
    .filter((item): item is DNVaststellingSyncItem => item !== null);
}

class LocalStorageVaststellingRepository implements VaststellingRepository {
  readonly name = "LocalStorageVaststellingRepository";
  readonly mode = "localstorage" as const;

  private readJson(key: string): unknown | null {
    if (typeof window === "undefined") {
      return null;
    }
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  }

  private writeJson(key: string, value: unknown): void {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  async loadActiveInspectorSession(inspectors: Inspector[]): Promise<ActiveInspectorSession | null> {
    try {
      return sanitizeActiveSession(
        this.readJson(ACTIVE_INSPECTOR_SESSION_KEY),
        new Set(inspectors.map((inspector) => inspector.id))
      );
    } catch {
      return null;
    }
  }

  async saveActiveInspectorSession(session: ActiveInspectorSession): Promise<void> {
    this.writeJson(ACTIVE_INSPECTOR_SESSION_KEY, session);
  }

  async clearActiveInspectorSession(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(ACTIVE_INSPECTOR_SESSION_KEY);
  }

  async loadDNVaststellingRecords(): Promise<DNVaststellingRecord[]> {
    try {
      return sanitizeRecordList(this.readJson(DN_VASTSTELLING_RECORDS_KEY));
    } catch {
      return [];
    }
  }

  async saveDNVaststellingRecords(records: DNVaststellingRecord[]): Promise<void> {
    this.writeJson(DN_VASTSTELLING_RECORDS_KEY, records);
  }

  async loadDNVaststellingSyncQueue(): Promise<DNVaststellingSyncItem[]> {
    try {
      return sanitizeSyncItemList(this.readJson(DN_VASTSTELLING_SYNC_QUEUE_KEY));
    } catch {
      return [];
    }
  }

  async saveDNVaststellingSyncQueue(items: DNVaststellingSyncItem[]): Promise<void> {
    this.writeJson(DN_VASTSTELLING_SYNC_QUEUE_KEY, items);
  }

  async loadDNVaststellingSyncSettings(): Promise<DNVaststellingSyncSettings> {
    try {
      return sanitizeSyncSettings(this.readJson(DN_VASTSTELLING_SYNC_SETTINGS_KEY));
    } catch {
      return DEFAULT_DN_VASTSTELLING_SYNC_SETTINGS;
    }
  }

  async saveDNVaststellingSyncSettings(settings: DNVaststellingSyncSettings): Promise<void> {
    this.writeJson(DN_VASTSTELLING_SYNC_SETTINGS_KEY, sanitizeSyncSettings(settings));
  }
}

class IndexedDbVaststellingRepository implements VaststellingRepository {
  readonly name = "IndexedDbVaststellingRepository";
  readonly mode = "indexeddb" as const;

  constructor(private readonly fallback: VaststellingRepository) {}

  private async openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB is niet beschikbaar."));
        return;
      }

      const request = indexedDB.open(DN_VASTSTELLING_IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(DN_VASTSTELLING_IDB_STORE)) {
          database.createObjectStore(DN_VASTSTELLING_IDB_STORE, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Kon IndexedDB niet openen."));
    });
  }

  private async readKey(key: string): Promise<unknown | null> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DN_VASTSTELLING_IDB_STORE, "readonly");
      const store = transaction.objectStore(DN_VASTSTELLING_IDB_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result as { key: string; value: unknown } | undefined;
        resolve(result?.value ?? null);
      };
      request.onerror = () => reject(request.error ?? new Error("Kon key niet lezen uit IndexedDB."));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
      transaction.onabort = () => db.close();
    });
  }

  private async writeKey(key: string, value: unknown): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(DN_VASTSTELLING_IDB_STORE, "readwrite");
      const store = transaction.objectStore(DN_VASTSTELLING_IDB_STORE);
      const request = store.put({ key, value });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("Kon key niet schrijven naar IndexedDB."));
      transaction.oncomplete = () => db.close();
      transaction.onerror = () => db.close();
      transaction.onabort = () => db.close();
    });
  }

  private async loadWithFallback<T>(
    key: string,
    sanitize: (raw: unknown) => T,
    fallbackLoader: () => Promise<T>
  ): Promise<T> {
    try {
      const value = await this.readKey(key);
      if (value !== null) {
        return sanitize(value);
      }
    } catch {
      // fallback below
    }

    const fromFallback = await fallbackLoader();
    try {
      await this.writeKey(key, fromFallback);
    } catch {
      // no-op: fallback already returned usable data
    }
    return fromFallback;
  }

  async loadActiveInspectorSession(inspectors: Inspector[]): Promise<ActiveInspectorSession | null> {
    return this.fallback.loadActiveInspectorSession(inspectors);
  }

  async saveActiveInspectorSession(session: ActiveInspectorSession): Promise<void> {
    await this.fallback.saveActiveInspectorSession(session);
  }

  async clearActiveInspectorSession(): Promise<void> {
    await this.fallback.clearActiveInspectorSession();
  }

  async loadDNVaststellingRecords(): Promise<DNVaststellingRecord[]> {
    return this.loadWithFallback(
      DN_VASTSTELLING_RECORDS_KEY,
      sanitizeRecordList,
      () => this.fallback.loadDNVaststellingRecords()
    );
  }

  async saveDNVaststellingRecords(records: DNVaststellingRecord[]): Promise<void> {
    try {
      await this.writeKey(DN_VASTSTELLING_RECORDS_KEY, records);
    } catch {
      await this.fallback.saveDNVaststellingRecords(records);
    }
  }

  async loadDNVaststellingSyncQueue(): Promise<DNVaststellingSyncItem[]> {
    return this.loadWithFallback(
      DN_VASTSTELLING_SYNC_QUEUE_KEY,
      sanitizeSyncItemList,
      () => this.fallback.loadDNVaststellingSyncQueue()
    );
  }

  async saveDNVaststellingSyncQueue(items: DNVaststellingSyncItem[]): Promise<void> {
    try {
      await this.writeKey(DN_VASTSTELLING_SYNC_QUEUE_KEY, items);
    } catch {
      await this.fallback.saveDNVaststellingSyncQueue(items);
    }
  }

  async loadDNVaststellingSyncSettings(): Promise<DNVaststellingSyncSettings> {
    return this.loadWithFallback(
      DN_VASTSTELLING_SYNC_SETTINGS_KEY,
      sanitizeSyncSettings,
      () => this.fallback.loadDNVaststellingSyncSettings()
    );
  }

  async saveDNVaststellingSyncSettings(settings: DNVaststellingSyncSettings): Promise<void> {
    const sanitized = sanitizeSyncSettings(settings);
    try {
      await this.writeKey(DN_VASTSTELLING_SYNC_SETTINGS_KEY, sanitized);
    } catch {
      await this.fallback.saveDNVaststellingSyncSettings(sanitized);
    }
  }
}

let repositorySingleton: VaststellingRepository | null = null;

function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

export function getVaststellingRepository(): VaststellingRepository {
  if (repositorySingleton) {
    return repositorySingleton;
  }

  const localStorageRepository = new LocalStorageVaststellingRepository();
  repositorySingleton = isIndexedDbAvailable()
    ? new IndexedDbVaststellingRepository(localStorageRepository)
    : localStorageRepository;

  return repositorySingleton;
}

export function resetVaststellingRepositoryCache(): void {
  repositorySingleton = null;
}
