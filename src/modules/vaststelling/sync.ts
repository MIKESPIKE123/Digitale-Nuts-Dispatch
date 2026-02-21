import type {
  DNVaststellingRecord,
  DNVaststellingSyncItem,
  DNVaststellingSyncSettings,
} from "./contracts";
import { getInspectionsGateway } from "../integrations/factory";

export interface DNVaststellingSyncRunResult {
  updatedQueue: DNVaststellingSyncItem[];
  processedCount: number;
  syncedCount: number;
  failedCount: number;
  offline: boolean;
  message: string;
}

function isOnline(): boolean {
  if (typeof navigator === "undefined") {
    return true;
  }
  return navigator.onLine;
}

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dnvs-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sanitizeKeyPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

function resolveMutationVersion(record: DNVaststellingRecord): string {
  return record.updatedAt || record.createdAt || new Date().toISOString();
}

function buildIdempotencyKey(
  inspectionId: string,
  itemType: DNVaststellingSyncItem["type"],
  mutationVersion: string
): string {
  return `dn-sync-${sanitizeKeyPart(inspectionId)}-${sanitizeKeyPart(mutationVersion)}-${sanitizeKeyPart(itemType)}`;
}

function buildSyncPayload(record: DNVaststellingRecord, itemType: DNVaststellingSyncItem["type"]): Record<string, unknown> {
  const mutationVersion = resolveMutationVersion(record);
  return {
    inspectionId: record.id,
    updatedAt: record.updatedAt,
    completionState: record.completionState,
    mutationVersion,
    idempotencyKey: buildIdempotencyKey(record.id, itemType, mutationVersion),
    photoEvidenceCount: Array.isArray(record.mutablePayload.photoEvidence)
      ? record.mutablePayload.photoEvidence.length
      : 0,
    record,
  };
}

function resolveSyncItemType(
  record: DNVaststellingRecord
): DNVaststellingSyncItem["type"] {
  const evidence = record.mutablePayload.photoEvidence;
  if (Array.isArray(evidence) && evidence.length > 0) {
    return "field_photos_added";
  }
  return "inspection_saved";
}

export function enqueueInspectionSync(
  queue: DNVaststellingSyncItem[],
  record: DNVaststellingRecord
): DNVaststellingSyncItem[] {
  const syncItemType = resolveSyncItemType(record);
  const dedupeInspectionId = record.id;
  const updatedQueue: DNVaststellingSyncItem[] = queue.map((item): DNVaststellingSyncItem => {
    if (item.status === "synced") {
      return item;
    }

    const itemInspectionId =
      typeof item.payload.inspectionId === "string" ? item.payload.inspectionId : "";

    if (itemInspectionId !== dedupeInspectionId) {
      return item;
    }

    return {
      ...item,
      type: syncItemType,
      status: "queued",
      payload: buildSyncPayload(record, syncItemType),
      lastError: undefined,
      syncedAt: undefined,
      responseCode: undefined,
      serverOutcome: undefined,
      serverSyncEventId: undefined,
      serverProcessedAt: undefined,
      serverMappedStatus: undefined,
      serverStatusMappingSource: undefined,
    };
  });

  const hasPending = updatedQueue.some((item) => {
    if (item.status === "synced") {
      return false;
    }
    return item.payload.inspectionId === dedupeInspectionId;
  });

  if (hasPending) {
    return updatedQueue;
  }

  return [
    {
      id: createId(),
      type: syncItemType,
      status: "queued",
      createdAt: new Date().toISOString(),
      payload: buildSyncPayload(record, syncItemType),
      attempts: 0,
    },
    ...updatedQueue,
  ];
}

export async function runDNVaststellingSyncBatch(
  queue: DNVaststellingSyncItem[],
  settings: DNVaststellingSyncSettings,
  options: { deviceId: string }
): Promise<DNVaststellingSyncRunResult> {
  const endpoint = settings.endpoint.trim();

  if (!endpoint) {
    return {
      updatedQueue: queue,
      processedCount: 0,
      syncedCount: 0,
      failedCount: 0,
      offline: false,
      message: "Sync endpoint ontbreekt in configuratie.",
    };
  }

  if (!isOnline()) {
    return {
      updatedQueue: queue,
      processedCount: 0,
      syncedCount: 0,
      failedCount: 0,
      offline: true,
      message: "Geen internetverbinding. Items blijven in wachtrij.",
    };
  }

  let processedCount = 0;
  let syncedCount = 0;
  let failedCount = 0;
  const updatedQueue: DNVaststellingSyncItem[] = [];
  const inspectionsGateway = getInspectionsGateway();

  for (const item of queue) {
    if (item.status === "synced") {
      updatedQueue.push(item);
      continue;
    }

    processedCount += 1;
    const attemptTs = new Date().toISOString();
    const inspectionId =
      typeof item.payload.inspectionId === "string" && item.payload.inspectionId.trim().length > 0
        ? item.payload.inspectionId
        : item.id;
    const mutationVersion =
      typeof item.payload.mutationVersion === "string" && item.payload.mutationVersion.trim().length > 0
        ? item.payload.mutationVersion
        : item.createdAt;
    const idempotencyKey =
      typeof item.payload.idempotencyKey === "string" && item.payload.idempotencyKey.trim().length > 0
        ? item.payload.idempotencyKey
        : buildIdempotencyKey(inspectionId, item.type, mutationVersion);

    try {
      const result = await inspectionsGateway.syncInspection({
        endpoint,
        timeoutMs: settings.requestTimeoutMs,
        itemId: item.id,
        itemType: item.type,
        inspectionId,
        idempotencyKey,
        mutationVersion,
        createdAt: item.createdAt,
        payload: item.payload,
        deviceId: options.deviceId,
        attempts: item.attempts + 1,
      });

      if (result.ok) {
        syncedCount += 1;

        updatedQueue.push({
          ...item,
          status: "synced",
          attempts: item.attempts + 1,
          lastAttemptAt: attemptTs,
          syncedAt: attemptTs,
          lastError: undefined,
          responseCode: result.statusCode,
          serverOutcome: result.ack?.outcome,
          serverSyncEventId: result.ack?.syncEventId,
          serverProcessedAt: result.ack?.processedAt,
          serverMappedStatus: result.ack?.mappedStatus,
          serverStatusMappingSource: result.ack?.statusMappingSource,
        });
        continue;
      }

      failedCount += 1;
      updatedQueue.push({
        ...item,
        status: "failed",
        attempts: item.attempts + 1,
        lastAttemptAt: attemptTs,
        lastError: result.error ?? `HTTP ${result.statusCode}`,
        responseCode: result.statusCode,
        serverOutcome: result.ack?.outcome ?? "rejected",
        serverSyncEventId: result.ack?.syncEventId,
        serverProcessedAt: result.ack?.processedAt,
        serverMappedStatus: result.ack?.mappedStatus,
        serverStatusMappingSource: result.ack?.statusMappingSource,
      });
    } catch (error) {
      failedCount += 1;
      const message = error instanceof Error ? error.message : "Onbekende sync fout";
      updatedQueue.push({
        ...item,
        status: "failed",
        attempts: item.attempts + 1,
        lastAttemptAt: attemptTs,
        lastError: message,
        responseCode: 0,
        serverOutcome: "rejected",
        serverSyncEventId: undefined,
        serverProcessedAt: undefined,
        serverMappedStatus: undefined,
        serverStatusMappingSource: undefined,
      });
    }
  }

  const message =
    processedCount === 0
      ? "Geen te syncen items in wachtrij."
      : `Sync klaar: ${syncedCount} geslaagd, ${failedCount} mislukt.`;

  return {
    updatedQueue,
    processedCount,
    syncedCount,
    failedCount,
    offline: false,
    message,
  };
}
