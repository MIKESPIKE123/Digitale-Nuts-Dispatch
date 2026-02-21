import type {
  DNVaststellingPhotoEvidence,
  DNVaststellingPhotoFieldKey,
} from "./contracts";

const PHOTO_FIELD_KEYS: DNVaststellingPhotoFieldKey[] = [
  "fotoVoor_url",
  "fotoDetail_url",
  "fotoNa_url",
];
const FALLBACK_MOCK_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/a8sAAAAASUVORK5CYII=";

type UpsertPhotoEvidenceInput = {
  fieldKey: DNVaststellingPhotoFieldKey;
  url: string;
  inspectionId: string;
  lat: number;
  lon: number;
  actorId: string;
  actorName: string;
  source?: DNVaststellingPhotoEvidence["source"];
};

function sanitizeEvidenceEntry(
  value: unknown
): DNVaststellingPhotoEvidence | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (
    data.fieldKey !== "fotoVoor_url" &&
    data.fieldKey !== "fotoDetail_url" &&
    data.fieldKey !== "fotoNa_url"
  ) {
    return null;
  }
  if (
    typeof data.url !== "string" ||
    typeof data.photoId !== "string" ||
    typeof data.takenAt !== "string" ||
    typeof data.lat !== "number" ||
    typeof data.lon !== "number" ||
    typeof data.actorId !== "string" ||
    typeof data.actorName !== "string" ||
    typeof data.hash !== "string"
  ) {
    return null;
  }

  return {
    fieldKey: data.fieldKey,
    url: data.url,
    photoId: data.photoId,
    takenAt: data.takenAt,
    lat: data.lat,
    lon: data.lon,
    actorId: data.actorId,
    actorName: data.actorName,
    hash: data.hash,
    source: data.source === "api" ? "api" : "mock",
  };
}

function normalizeEvidenceList(
  existing: unknown
): DNVaststellingPhotoEvidence[] {
  if (!Array.isArray(existing)) {
    return [];
  }
  return existing
    .map((item) => sanitizeEvidenceEntry(item))
    .filter((item): item is DNVaststellingPhotoEvidence => item !== null);
}

function simpleHash(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0");
}

export function isPhotoFieldKey(value: string): value is DNVaststellingPhotoFieldKey {
  return PHOTO_FIELD_KEYS.includes(value as DNVaststellingPhotoFieldKey);
}

export function buildMockPhotoUrl(
  inspectionId: string,
  fieldKey: DNVaststellingPhotoFieldKey
): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  if (typeof document === "undefined") {
    return `mock://dn-vaststelling/${inspectionId}/${fieldKey}/${stamp}.jpg`;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return FALLBACK_MOCK_IMAGE_DATA_URL;
  }

  ctx.fillStyle = "#0b3a53";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a9396";
  ctx.fillRect(0, 0, canvas.width, 64);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("DN MOCK FOTO", 20, 40);
  ctx.font = "18px sans-serif";
  ctx.fillText(`Veld: ${fieldKey}`, 20, 120);
  ctx.fillText(`Record: ${inspectionId.slice(0, 18)}`, 20, 154);
  ctx.fillText(new Date().toLocaleString("nl-BE"), 20, 188);

  return canvas.toDataURL("image/jpeg", 0.88);
}

export function upsertPhotoEvidence(
  existing: unknown,
  input: UpsertPhotoEvidenceInput
): DNVaststellingPhotoEvidence[] {
  const normalized = normalizeEvidenceList(existing).filter(
    (item) => item.fieldKey !== input.fieldKey
  );
  const normalizedUrl = input.url.trim();
  if (!normalizedUrl) {
    return normalized;
  }

  const takenAt = new Date().toISOString();
  const raw = [
    input.inspectionId,
    input.fieldKey,
    normalizedUrl,
    takenAt,
    input.lat.toFixed(6),
    input.lon.toFixed(6),
    input.actorId,
  ].join("|");

  normalized.push({
    fieldKey: input.fieldKey,
    url: normalizedUrl,
    photoId: `${input.inspectionId}-${input.fieldKey}-${Date.now()}`,
    takenAt,
    lat: input.lat,
    lon: input.lon,
    actorId: input.actorId,
    actorName: input.actorName,
    hash: simpleHash(raw),
    source: input.source ?? "mock",
  });

  return normalized;
}

export function findPhotoEvidenceByField(
  existing: unknown,
  fieldKey: DNVaststellingPhotoFieldKey
): DNVaststellingPhotoEvidence | null {
  const normalized = normalizeEvidenceList(existing);
  return normalized.find((item) => item.fieldKey === fieldKey) ?? null;
}
