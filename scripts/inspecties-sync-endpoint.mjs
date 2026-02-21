import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const STORE_FILE = "dn_sync_idempotency_store_v1.json";
const EVENTS_FILE = "dn_sync_events_v1.json";
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const MAX_EVENTS = 5000;
const SERVER_VERSION = "dn-sync-api-v1";
const ALLOWED_ITEM_TYPES = new Set(["inspection_saved", "handover_decision", "field_photos_added"]);

let writeLock = Promise.resolve();

function withWriteLock(task) {
  const next = writeLock.then(task, task);
  writeLock = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readHeaderIdempotencyKey(req) {
  const raw = req.headers["x-idempotency-key"];
  if (Array.isArray(raw)) {
    return normalizeText(raw[0]);
  }
  return normalizeText(raw);
}

function buildPaths(rootDir) {
  const dataDir = path.join(rootDir, "DATA");
  return {
    dataDir,
    storePath: path.join(dataDir, STORE_FILE),
    eventsPath: path.join(dataDir, EVENTS_FILE),
  };
}

async function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return isObject(parsed) ? parsed : fallbackValue;
  } catch {
    return fallbackValue;
  }
}

async function writeJsonAtomic(filePath, data) {
  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), "utf8");
  await fs.rename(tmpPath, filePath);
}

function getMappedStatus(command) {
  const payload = isObject(command.payload) ? command.payload : {};
  const record = isObject(payload.record) ? payload.record : {};
  const mutablePayload = isObject(record.mutablePayload) ? record.mutablePayload : {};
  const formData = isObject(mutablePayload.formData) ? mutablePayload.formData : {};

  const rawFormStatus = normalizeText(formData.status).toLowerCase();
  const rawFase = normalizeText(formData.fase).toLowerCase();
  const completionState = normalizeText(record.completionState).toLowerCase();

  if (rawFormStatus === "afgesloten") {
    return { mappedStatus: "closed", statusMappingSource: "formData.status=afgesloten" };
  }

  if (rawFase === "definitief_herstel") {
    return { mappedStatus: "closed", statusMappingSource: "formData.fase=definitief_herstel" };
  }

  if (completionState === "synced") {
    return { mappedStatus: "closed", statusMappingSource: "record.completionState=synced" };
  }

  if (rawFase === "tijdelijk_herstel") {
    return { mappedStatus: "temporary_restore", statusMappingSource: "formData.fase=tijdelijk_herstel" };
  }

  if (rawFormStatus === "in_behandeling") {
    return { mappedStatus: "in_progress", statusMappingSource: "formData.status=in_behandeling" };
  }

  if (rawFormStatus === "open") {
    return { mappedStatus: "in_progress", statusMappingSource: "formData.status=open" };
  }

  if (rawFormStatus === "geparkeerd") {
    return { mappedStatus: "in_progress", statusMappingSource: "formData.status=geparkeerd" };
  }

  if (completionState === "queued" || completionState === "valid") {
    return { mappedStatus: "in_progress", statusMappingSource: `record.completionState=${completionState}` };
  }

  return { mappedStatus: "planned", statusMappingSource: "default" };
}

function validateSyncCommand(command, headerIdempotencyKey) {
  const issues = [];

  if (!isObject(command)) {
    return ["Body moet een JSON object zijn."];
  }

  const itemId = normalizeText(command.itemId);
  const itemType = normalizeText(command.itemType);
  const inspectionId = normalizeText(command.inspectionId);
  const idempotencyKey = normalizeText(command.idempotencyKey);
  const mutationVersion = normalizeText(command.mutationVersion);
  const createdAt = normalizeText(command.createdAt);
  const deviceId = normalizeText(command.deviceId);
  const attempts = command.attempts;

  if (!itemId) {
    issues.push("`itemId` is verplicht.");
  }

  if (!ALLOWED_ITEM_TYPES.has(itemType)) {
    issues.push("`itemType` is ongeldig.");
  }

  if (!inspectionId) {
    issues.push("`inspectionId` is verplicht.");
  }

  if (!idempotencyKey) {
    issues.push("`idempotencyKey` is verplicht.");
  }

  if (!mutationVersion) {
    issues.push("`mutationVersion` is verplicht.");
  }

  if (!createdAt) {
    issues.push("`createdAt` is verplicht.");
  }

  if (!deviceId) {
    issues.push("`deviceId` is verplicht.");
  }

  if (typeof attempts !== "number" || Number.isNaN(attempts) || attempts < 0) {
    issues.push("`attempts` moet een getal >= 0 zijn.");
  }

  if (!isObject(command.payload)) {
    issues.push("`payload` is verplicht en moet een object zijn.");
  } else {
    const payloadInspectionId = normalizeText(command.payload.inspectionId);
    if (payloadInspectionId && payloadInspectionId !== inspectionId) {
      issues.push("`payload.inspectionId` moet gelijk zijn aan `inspectionId`.");
    }

    const payloadIdempotencyKey = normalizeText(command.payload.idempotencyKey);
    if (payloadIdempotencyKey && payloadIdempotencyKey !== idempotencyKey) {
      issues.push("`payload.idempotencyKey` moet gelijk zijn aan `idempotencyKey`.");
    }
  }

  if (headerIdempotencyKey && idempotencyKey && headerIdempotencyKey !== idempotencyKey) {
    issues.push("Header `X-Idempotency-Key` komt niet overeen met body `idempotencyKey`.");
  }

  return issues;
}

function buildRejectedResponse(command, idempotencyKey, issues) {
  return {
    statusCode: 422,
    body: {
      outcome: "rejected",
      inspectionId: normalizeText(command?.inspectionId),
      idempotencyKey,
      syncEventId: undefined,
      processedAt: new Date().toISOString(),
      serverVersion: SERVER_VERSION,
      error: "VALIDATION_FAILED",
      details: issues,
    },
  };
}

export async function processInspectionSyncCommand(command, options = {}) {
  const rootDir = options.rootDir ? path.resolve(options.rootDir) : process.cwd();
  const { dataDir, storePath, eventsPath } = buildPaths(rootDir);
  const headerIdempotencyKey = normalizeText(options.headerIdempotencyKey);
  const idempotencyKey = normalizeText(command?.idempotencyKey || headerIdempotencyKey);
  const issues = validateSyncCommand(command, headerIdempotencyKey);

  if (issues.length > 0) {
    return buildRejectedResponse(command, idempotencyKey, issues);
  }

  return withWriteLock(async () => {
    await fs.mkdir(dataDir, { recursive: true });

    const emptyStore = { version: 1, updatedAt: null, entriesByKey: {} };
    const emptyEvents = { version: 1, updatedAt: null, events: [] };

    const store = await readJsonFile(storePath, emptyStore);
    const events = await readJsonFile(eventsPath, emptyEvents);

    const existingEntry = isObject(store.entriesByKey) ? store.entriesByKey[idempotencyKey] : undefined;
    if (isObject(existingEntry)) {
      return {
        statusCode: 208,
        body: {
          outcome: "duplicate",
          inspectionId: existingEntry.inspectionId,
          idempotencyKey,
          syncEventId: existingEntry.syncEventId,
          processedAt: existingEntry.processedAt,
          serverVersion: SERVER_VERSION,
          mappedStatus: existingEntry.mappedStatus,
          statusMappingSource: existingEntry.statusMappingSource,
        },
      };
    }

    const processedAt = new Date().toISOString();
    const syncEventId =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `sync-event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const mapping = getMappedStatus(command);
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify(command.payload))
      .digest("hex");

    store.entriesByKey = isObject(store.entriesByKey) ? store.entriesByKey : {};
    store.entriesByKey[idempotencyKey] = {
      inspectionId: command.inspectionId,
      syncEventId,
      processedAt,
      mappedStatus: mapping.mappedStatus,
      statusMappingSource: mapping.statusMappingSource,
      payloadHash,
      mutationVersion: command.mutationVersion,
    };
    store.updatedAt = processedAt;

    const nextEvents = Array.isArray(events.events) ? events.events : [];
    nextEvents.push({
      syncEventId,
      inspectionId: command.inspectionId,
      idempotencyKey,
      itemType: command.itemType,
      mappedStatus: mapping.mappedStatus,
      statusMappingSource: mapping.statusMappingSource,
      payloadHash,
      receivedAt: processedAt,
      deviceId: command.deviceId,
      attempts: command.attempts,
    });
    events.events = nextEvents.slice(-MAX_EVENTS);
    events.updatedAt = processedAt;

    await writeJsonAtomic(storePath, store);
    await writeJsonAtomic(eventsPath, events);

    return {
      statusCode: 201,
      body: {
        outcome: "accepted",
        inspectionId: command.inspectionId,
        idempotencyKey,
        syncEventId,
        processedAt,
        serverVersion: SERVER_VERSION,
        mappedStatus: mapping.mappedStatus,
        statusMappingSource: mapping.statusMappingSource,
      },
    };
  });
}

function createInputError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    let raw = "";

    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(createInputError(413, "Payload te groot voor sync endpoint."));
        req.destroy();
        return;
      }
      raw += chunk.toString("utf8");
    });

    req.on("end", () => {
      if (!raw.trim()) {
        reject(createInputError(400, "Lege request body."));
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(createInputError(400, "Body is geen geldige JSON."));
      }
    });

    req.on("error", (error) => {
      reject(error);
    });
  });
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function handleInspectionSyncRequest(req, res, options = {}) {
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const command = await readJsonBody(req);
    const result = await processInspectionSyncCommand(command, {
      rootDir: options.rootDir,
      headerIdempotencyKey: readHeaderIdempotencyKey(req),
    });

    sendJson(res, result.statusCode, result.body);
  } catch (error) {
    const statusCode = typeof error?.statusCode === "number" ? error.statusCode : 500;
    const message =
      statusCode >= 500
        ? "SYNC_ENDPOINT_ERROR"
        : error instanceof Error
          ? error.message
          : "SYNC_ENDPOINT_ERROR";
    sendJson(res, statusCode, { error: message });
  }
}
