import { useCallback, useEffect, useMemo, useState } from "react";
import type { Inspector, PlannedVisit } from "../../types";
import type {
  ActiveInspectorSession,
  DNVaststellingCompletionState,
  DNVaststellingFieldValue,
  DNVaststellingPhotoFieldKey,
  DNVaststellingRecord,
  DNVaststellingSyncItem,
} from "./contracts";
import { updateDNVaststellingMutablePayload } from "./immutability";
import { createDNVaststellingDraft, mapVisitToDNVaststellingContext } from "./mappers";
import { parseArchisnapperCSV, type Field, type Option, type ParsedSchema, type Section } from "./schema";
import {
  loadDNVaststellingRecords,
  loadDNVaststellingSyncQueue,
  loadDNVaststellingSyncSettings,
  saveDNVaststellingRecords,
  saveDNVaststellingSyncQueue,
  saveDNVaststellingSyncSettings,
} from "./storage";
import { enqueueInspectionSync, runDNVaststellingSyncBatch } from "./sync";
import { countNokFindings, validateDNVaststellingRecord } from "./validation";
import { buildChecklistCouplingPatch } from "./checklistCoupling";
import { exportDNVaststellingPdf } from "./pdfReport";
import { calculateChecklistScore } from "./checklistScore";
import {
  buildMockPhotoUrl,
  findPhotoEvidenceByField,
  isPhotoFieldKey,
  upsertPhotoEvidence,
} from "./photoEvidence";
import csvText from "./data/archisnapper.csv?raw";

type VaststellingViewProps = {
  inspectors: Inspector[];
  selectedDate: string;
  visitsByInspector: Record<string, PlannedVisit[]>;
  utilityCompanyOptions: string[];
  selectedVisit: PlannedVisit | null;
  onSelectVisit: (visitId: string | null) => void;
  activeSession: ActiveInspectorSession | null;
  onSwitchSession: (inspectorId: string) => void;
  onDemoReset: () => void;
};

const RESPONSIBLE_PARTIES = [
  "Aannemer",
  "Nutsmaatschappij",
  "Stad Antwerpen",
  "Signalisatiebedrijf",
] as const;

const DN_V2_CORE_SECTION_ID = "dn_v2_kernvelden";
const DN_V2_CORE_SECTION_TITLE = "DN Vaststelling v2 - Kernvelden";

const DISTRICT_OPTIONS = [
  "Antwerpen",
  "Berchem",
  "Berendrecht-Zandvliet-Lillo",
  "Borgerhout",
  "Deurne",
  "Ekeren",
  "Hoboken",
  "Merksem",
  "Wilrijk",
  "Borsbeek",
] as const;

const INGREEP_TYPE_OPTIONS = [
  "sleuf",
  "aansluiting",
  "herstelling",
  "cabine",
  "inspectie",
  "signalisatie",
] as const;

const FASE_OPTIONS = ["uitvoering", "tijdelijk_herstel", "definitief_herstel"] as const;
const STATUS_OPTIONS = ["open", "in_behandeling", "geparkeerd", "afgesloten"] as const;
const PRIORITEIT_OPTIONS = ["normaal", "hoog", "rood_vlag"] as const;
const TAG_OPTIONS = ["GEPLAND", "VRIJ", "NS-kern"] as const;
const VERHARDING_TYPE_OPTIONS = [
  "kassei",
  "beton",
  "asfalt",
  "klinker",
  "natuursteen",
  "grasdals",
  "grind",
] as const;
const KRITIEKE_ZONE_OPTIONS = ["nee", "ja"] as const;
const MAX_PHOTO_STORAGE_BYTES = 850_000;
const MAX_PHOTO_EXPORT_BYTES = 1_800_000;
const MAX_PHOTO_WIDTH = 1440;
const MAX_PHOTO_HEIGHT = 1080;
const PHOTO_JPEG_QUALITIES = [0.82, 0.72, 0.62, 0.52] as const;

const CORE_CANONICAL_FIELD_KEYS = new Set([
  "district",
  "locPrecisionM",
  "ingreepType",
  "fase",
  "verhardingType",
  "kritiekeZone",
  "aannemer",
  "nutsBedrijfSelect",
  "signVergNr",
  "herstelbonNr",
  "fotoVoor_url",
  "fotoDetail_url",
  "fotoNa_url",
  "termijnHerstel",
  "status",
  "prioriteit",
  "maatregel",
  "heropenReden",
  "tags",
]);

function toOptions(values: readonly string[]): Option[] {
  return values.map((value) => ({ value, label: value }));
}

function buildV2CoreSection(utilityCompanyOptions: string[]): Section {
  const companyOptions = toOptions(utilityCompanyOptions);
  const fields: Field[] = [
    {
      key: "district",
      label: "District",
      type: "select",
      required: true,
      options: toOptions(DISTRICT_OPTIONS),
    },
    {
      key: "locPrecisionM",
      label: "Locatie-precisie (m)",
      type: "input",
      required: false,
      hint: "Afgeleid op basis van locatiebron (exact of postcode), manueel overschrijfbaar.",
    },
    {
      key: "ingreepType",
      label: "Type ingreep",
      type: "select",
      required: true,
      options: toOptions(INGREEP_TYPE_OPTIONS),
    },
    {
      key: "fase",
      label: "Fase",
      type: "select",
      required: true,
      options: toOptions(FASE_OPTIONS),
    },
    {
      key: "verhardingType",
      label: "Verharding",
      type: "select",
      required: true,
      options: toOptions(VERHARDING_TYPE_OPTIONS),
    },
    {
      key: "kritiekeZone",
      label: "Kritieke zone",
      type: "select",
      required: false,
      options: toOptions(KRITIEKE_ZONE_OPTIONS),
      hint: "Wordt automatisch op ja gezet bij relevante NOK-checklistitems.",
    },
    {
      key: "aannemer",
      label: "Aannemer/ploeg",
      type: "input",
      required: false,
    },
    {
      key: "nutsBedrijfSelect",
      label: "Nuts-bedrijf (beheerder)",
      type: companyOptions.length > 0 ? "select" : "input",
      required: false,
      options: companyOptions.length > 0 ? companyOptions : undefined,
      hint: "Unieke lijst op basis van actuele GIPOD-dataset.",
    },
    {
      key: "signVergNr",
      label: "Signalisatievergunning nr",
      type: "input",
      required: false,
      hint: "Wordt standaard gevuld met de Referentie/GW.",
    },
    {
      key: "herstelbonNr",
      label: "Herstelbon nr",
      type: "input",
      required: false,
      hint: "Manueel in te vullen tot externe bron beschikbaar is.",
    },
    {
      key: "termijnHerstel",
      label: "Uiterste hersteldatum",
      type: "input",
      required: true,
      hint: "Formaat: YYYY-MM-DD.",
    },
    {
      key: "fotoVoor_url",
      label: "Foto VOOR",
      type: "input",
      required: false,
      hint: "Gebruik camera of file picker om foto toe te voegen (URL is optioneel geavanceerd).",
    },
    {
      key: "fotoDetail_url",
      label: "Foto DETAIL",
      type: "input",
      required: false,
      hint: "Gebruik camera of file picker om detailfoto toe te voegen (URL is optioneel geavanceerd).",
    },
    {
      key: "fotoNa_url",
      label: "Foto NA",
      type: "input",
      required: false,
      hint: "Verplicht bij status afgesloten of fase definitief herstel.",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      required: true,
      options: toOptions(STATUS_OPTIONS),
    },
    {
      key: "prioriteit",
      label: "Prioriteit",
      type: "select",
      required: false,
      options: toOptions(PRIORITEIT_OPTIONS),
    },
    {
      key: "maatregel",
      label: "Gevraagde maatregel",
      type: "textarea",
      required: false,
    },
    {
      key: "heropenReden",
      label: "Heropeningsreden",
      type: "textarea",
      required: false,
    },
    {
      key: "tags",
      label: "Tags",
      type: "multiselect",
      required: false,
      options: toOptions(TAG_OPTIONS),
    },
  ];

  return {
    id: DN_V2_CORE_SECTION_ID,
    title: DN_V2_CORE_SECTION_TITLE,
    items: fields,
  };
}

function withV2CoreFields(
  baseSchema: ParsedSchema,
  utilityCompanyOptions: string[]
): ParsedSchema {
  if (baseSchema.sections.some((section) => section.id === DN_V2_CORE_SECTION_ID)) {
    return baseSchema;
  }

  const coreSection = buildV2CoreSection(utilityCompanyOptions);
  const nextSections = [coreSection, ...baseSchema.sections];
  const fieldsByLabel: Record<string, Field> = { ...baseSchema.index.fieldsByLabel };
  const fieldsByKey: Record<string, Field> = { ...baseSchema.index.fieldsByKey };

  coreSection.items.forEach((field) => {
    fieldsByKey[field.key] = field;
    fieldsByLabel[field.label.toLowerCase()] = field;
  });

  return {
    ...baseSchema,
    sections: nextSections,
    index: {
      fieldsByLabel,
      fieldsByKey,
    },
  };
}

function formatAddressFromVisit(visit: PlannedVisit): string {
  return `${visit.work.straat} ${visit.work.huisnr}, ${visit.work.postcode} ${visit.work.district}`
    .replace(/\s+/g, " ")
    .trim();
}

function getFormData(record: DNVaststellingRecord | null): Record<string, DNVaststellingFieldValue> {
  if (!record) {
    return {};
  }

  const raw = record.mutablePayload.formData;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const parsed: Record<string, DNVaststellingFieldValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      parsed[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function isNokValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().toUpperCase().startsWith("NOK");
}

function hasFieldValue(value: DNVaststellingFieldValue | undefined): boolean {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return false;
}

function isDataImageUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(value.trim());
}

function isAnyDataImageUrl(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  return /^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(value.trim());
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Kon bestand niet lezen."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Bestandsinhoud is ongeldig."));
        return;
      }
      resolve(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl: string): number {
  const [, payload = ""] = dataUrl.split(",");
  const normalized = payload.replace(/=+$/, "");
  return Math.floor((normalized.length * 3) / 4);
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Kon de geselecteerde afbeelding niet verwerken."));
    image.src = dataUrl;
  });
}

async function optimizeImageForStorage(dataUrl: string): Promise<{ dataUrl: string; bytes: number }> {
  if (typeof document === "undefined") {
    return { dataUrl, bytes: estimateDataUrlBytes(dataUrl) };
  }

  const image = await loadImageFromDataUrl(dataUrl);
  const widthScale = MAX_PHOTO_WIDTH / image.width;
  const heightScale = MAX_PHOTO_HEIGHT / image.height;
  const scale = Math.min(1, widthScale, heightScale);
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return { dataUrl, bytes: estimateDataUrlBytes(dataUrl) };
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  let bestDataUrl = canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITIES[0]);
  let bestBytes = estimateDataUrlBytes(bestDataUrl);

  for (const quality of PHOTO_JPEG_QUALITIES) {
    const candidate = canvas.toDataURL("image/jpeg", quality);
    const candidateBytes = estimateDataUrlBytes(candidate);
    bestDataUrl = candidate;
    bestBytes = candidateBytes;
    if (candidateBytes <= MAX_PHOTO_STORAGE_BYTES) {
      break;
    }
  }

  return { dataUrl: bestDataUrl, bytes: bestBytes };
}

function summarizePhotoValue(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "Geen foto geselecteerd";
  }

  const trimmed = value.trim();
  if (isDataImageUrl(trimmed)) {
    return "Lokale foto geselecteerd (embedded)";
  }

  if (trimmed.startsWith("mock://")) {
    return "Mock foto gekoppeld";
  }

  const compactUrl = trimmed.length > 74 ? `${trimmed.slice(0, 71)}...` : trimmed;
  return `Externe URL: ${compactUrl}`;
}

function statusLabel(state: DNVaststellingCompletionState): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "valid":
      return "Valid";
    case "queued":
      return "In wachtrij";
    default:
      return "Gesynct";
  }
}

function resolveChecklistScoreLabel(record: DNVaststellingRecord): string {
  if (typeof record.mutablePayload.checklistScore === "number") {
    return `${Math.round(record.mutablePayload.checklistScore)}`;
  }

  const fallback = calculateChecklistScore(getFormData(record));
  return `${fallback.score}`;
}

function normalizeForMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resolvePostcodeOptionLabel(
  value: string,
  options?: Array<{ value: string; label: string }>
): string {
  if (!options || options.length === 0) {
    return value;
  }
  const exact = options.find((option) => option.label === value || option.value === value);
  if (exact) {
    return exact.label;
  }
  const startsWith = options.find(
    (option) => option.label.startsWith(value) || option.value.startsWith(value)
  );
  return startsWith ? startsWith.label : value;
}

function resolveWerfinnameAreaValue(work: PlannedVisit["work"]): string {
  const dynamicWork = work as PlannedVisit["work"] & Record<string, unknown>;
  const candidateKeys = [
    "oppervlakteWerfinname",
    "oppervlakte_werfinname",
    "werfinnameOppervlakte",
    "oppervlakteWerfInname",
    "oppervlakteWERFINNAME",
    "oppervlakteWerfinnameM2",
  ];

  for (const key of candidateKeys) {
    const value = dynamicWork[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return `${value}`;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function resolveAannemerFromWork(work: PlannedVisit["work"]): string {
  const dynamicWork = work as PlannedVisit["work"] & Record<string, unknown>;
  const candidateKeys = [
    "aannemer",
    "aannemerNaam",
    "contractor",
    "contractorName",
    "uitvoerder",
  ];

  for (const key of candidateKeys) {
    const value = dynamicWork[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function resolveHerstelbonFromWork(work: PlannedVisit["work"]): string {
  const dynamicWork = work as PlannedVisit["work"] & Record<string, unknown>;
  const candidateKeys = [
    "herstelbonNr",
    "herstelbon",
    "herbestratingsbon",
    "repairTicketId",
    "restoreTicketId",
  ];

  for (const key of candidateKeys) {
    const value = dynamicWork[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return "";
}

function mapWerftypeToIngreepType(werftype: string): string {
  const normalized = normalizeForMatch(werftype);

  if (normalized.includes("sleuf")) {
    return "sleuf";
  }
  if (normalized.includes("aansluit")) {
    return "aansluiting";
  }
  if (normalized.includes("herstel")) {
    return "herstelling";
  }
  if (normalized.includes("cabine")) {
    return "cabine";
  }
  if (normalized.includes("signal")) {
    return "signalisatie";
  }
  if (normalized.length > 0) {
    return "inspectie";
  }
  return "";
}

function mapVisitTypeToFase(visitType: PlannedVisit["visitType"]): string {
  switch (visitType) {
    case "EIND":
      return "definitief_herstel";
    case "TUSSEN":
      return "tijdelijk_herstel";
    default:
      return "uitvoering";
  }
}

function mapWorkStatusToVaststellingStatus(status: PlannedVisit["work"]["status"]): string {
  switch (status) {
    case "IN EFFECT":
      return "in_behandeling";
    default:
      return "open";
  }
}

function mapDispatchPriorityToVaststellingPriority(priority: number): string {
  if (priority >= 150) {
    return "rood_vlag";
  }
  if (priority >= 110) {
    return "hoog";
  }
  return "normaal";
}

function resolveLocationPrecisionM(locationSource: PlannedVisit["work"]["locationSource"]): string {
  return locationSource === "exact" ? "5" : "150";
}

function buildTagsForVisit(visit: PlannedVisit): string[] {
  const tags: string[] = [];

  if (visit.mandatory) {
    tags.push("GEPLAND");
  } else {
    tags.push("VRIJ");
  }

  if (visit.priority >= 150) {
    tags.push("NS-kern");
  }

  return tags;
}

function buildSeededFormDataFromVisit(
  schema: ReturnType<typeof parseArchisnapperCSV>,
  visit: PlannedVisit
): Record<string, DNVaststellingFieldValue> {
  const next: Record<string, DNVaststellingFieldValue> = {};
  const gps = `${visit.work.location.lat.toFixed(6)}, ${visit.work.location.lng.toFixed(6)}`;
  const addressLine = `${visit.work.straat} ${visit.work.huisnr}`.trim();
  const werfinnameArea = resolveWerfinnameAreaValue(visit.work);
  const aannemerFromWork = resolveAannemerFromWork(visit.work);
  const herstelbonFromWork = resolveHerstelbonFromWork(visit.work);

  for (const section of schema.sections) {
    const normalizedSection = normalizeForMatch(section.title);
    for (const field of section.items) {
      const normalizedLabel = normalizeForMatch(field.label);

      if (normalizedLabel.includes("bonu nr")) {
        next[field.key] = visit.work.bonuNummer || visit.work.dossierId;
        continue;
      }

      if (normalizedLabel.includes("gipod nr")) {
        next[field.key] = visit.work.gipodId || "";
        continue;
      }

      if (normalizedLabel.includes("gw nr")) {
        next[field.key] = visit.work.referentieId || "";
        continue;
      }

      if (normalizedLabel.includes("postcode")) {
        next[field.key] = resolvePostcodeOptionLabel(visit.work.postcode, field.options);
        continue;
      }

      if (
        normalizedLabel.includes("straatnaam en huisnummer") ||
        (normalizedLabel.includes("straat") && normalizedLabel.includes("huisnummer"))
      ) {
        next[field.key] = addressLine;
        continue;
      }

      if (normalizedLabel.includes("gps code")) {
        next[field.key] = gps;
        continue;
      }

      if (normalizedLabel.includes("nutsbedrijf")) {
        next[field.key] = visit.work.nutsBedrijf || "";
        continue;
      }

      if (normalizedLabel.includes("oppervlakte") && normalizedLabel.includes("werfinname")) {
        if (werfinnameArea) {
          next[field.key] = werfinnameArea;
        }
        continue;
      }

      if (normalizedSection.includes("inspecteurs") && normalizedLabel === "naam") {
        next[field.key] = visit.inspectorName;
      }
    }
  }

  const setCanonicalField = (
    fieldKey: string,
    value: DNVaststellingFieldValue | undefined
  ) => {
    if (!schema.index.fieldsByKey[fieldKey] || value === undefined) {
      return;
    }
    if (typeof value === "string" && value.trim().length === 0) {
      return;
    }
    if (Array.isArray(value) && value.length === 0) {
      return;
    }
    next[fieldKey] = value;
  };

  setCanonicalField("district", visit.work.district);
  setCanonicalField("locPrecisionM", resolveLocationPrecisionM(visit.work.locationSource));
  setCanonicalField("ingreepType", mapWerftypeToIngreepType(visit.work.werftype));
  setCanonicalField("fase", mapVisitTypeToFase(visit.visitType));
  setCanonicalField("kritiekeZone", "nee");
  setCanonicalField("aannemer", aannemerFromWork);
  setCanonicalField("nutsBedrijfSelect", visit.work.nutsBedrijf || "");
  setCanonicalField("signVergNr", visit.work.referentieId || "");
  setCanonicalField("herstelbonNr", herstelbonFromWork);
  setCanonicalField("termijnHerstel", visit.work.endDate || "");
  setCanonicalField("status", mapWorkStatusToVaststellingStatus(visit.work.status));
  setCanonicalField("prioriteit", mapDispatchPriorityToVaststellingPriority(visit.priority));
  setCanonicalField("tags", buildTagsForVisit(visit));

  return next;
}

export function VaststellingView({
  inspectors,
  selectedDate,
  visitsByInspector,
  utilityCompanyOptions,
  selectedVisit,
  onSelectVisit,
  activeSession,
  onSwitchSession,
  onDemoReset,
}: VaststellingViewProps) {
  const schema = useMemo(
    () => withV2CoreFields(parseArchisnapperCSV(csvText), utilityCompanyOptions),
    [utilityCompanyOptions]
  );
  const [records, setRecords] = useState<DNVaststellingRecord[]>([]);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [syncQueue, setSyncQueue] = useState<DNVaststellingSyncItem[]>([]);
  const [syncRunning, setSyncRunning] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [sessionSelectId, setSessionSelectId] = useState("");
  const [validationTouched, setValidationTouched] = useState(false);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Record<string, boolean>>({});
  const [syncEndpoint, setSyncEndpoint] = useState("");
  const [autoSyncOnOnline, setAutoSyncOnOnline] = useState(true);
  const [requestTimeoutMs, setRequestTimeoutMs] = useState(15000);

  useEffect(() => {
    let cancelled = false;

    const loadInitialState = async () => {
      const [loadedRecords, loadedQueue, loadedSettings] = await Promise.all([
        loadDNVaststellingRecords(),
        loadDNVaststellingSyncQueue(),
        loadDNVaststellingSyncSettings(),
      ]);
      if (cancelled) {
        return;
      }

      setRecords(loadedRecords);
      setSyncQueue(loadedQueue);
      setSyncEndpoint(loadedSettings.endpoint);
      setAutoSyncOnOnline(loadedSettings.autoSyncOnOnline);
      setRequestTimeoutMs(loadedSettings.requestTimeoutMs);
      if (loadedRecords[0]) {
        setActiveRecordId(loadedRecords[0].id);
      }
    };

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeSession) {
      setSessionSelectId(activeSession.inspectorId);
      return;
    }

    if (inspectors[0]) {
      setSessionSelectId(inspectors[0].id);
    }
  }, [activeSession, inspectors]);

  useEffect(() => {
    if (!activeRecordId) {
      return;
    }

    if (!records.some((item) => item.id === activeRecordId)) {
      setActiveRecordId(records[0]?.id ?? null);
    }
  }, [activeRecordId, records]);

  const persistRecords = useCallback((updater: (previous: DNVaststellingRecord[]) => DNVaststellingRecord[]) => {
    setRecords((previous) => {
      const next = updater(previous);
      void saveDNVaststellingRecords(next);
      return next;
    });
  }, []);

  const saveSyncSettings = useCallback(
    (next: { endpoint: string; autoSyncOnOnline: boolean; requestTimeoutMs: number }) => {
      void saveDNVaststellingSyncSettings(next);
      setSyncEndpoint(next.endpoint);
      setAutoSyncOnOnline(next.autoSyncOnOnline);
      setRequestTimeoutMs(next.requestTimeoutMs);
    },
    []
  );

  const myVisits = useMemo(() => {
    if (!activeSession) {
      return [] as PlannedVisit[];
    }

    return [...(visitsByInspector[activeSession.inspectorId] ?? [])].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.work.endDate.localeCompare(b.work.endDate);
    });
  }, [activeSession, visitsByInspector]);

  const effectiveVisit = useMemo(() => {
    if (!activeSession) {
      return null;
    }

    if (selectedVisit && selectedVisit.inspectorId === activeSession.inspectorId) {
      return selectedVisit;
    }

    return myVisits[0] ?? null;
  }, [activeSession, myVisits, selectedVisit]);

  const activeRecord = useMemo(
    () => records.find((item) => item.id === activeRecordId) ?? null,
    [activeRecordId, records]
  );

  const activeFormData = useMemo(() => getFormData(activeRecord), [activeRecord]);

  const validation = useMemo(() => {
    if (!activeRecord) {
      return null;
    }
    return validateDNVaststellingRecord(schema, activeRecord);
  }, [activeRecord, schema]);

  const issueInputKeys = useMemo(
    () => new Set(validation?.issues.map((issue) => issue.inputKey) ?? []),
    [validation]
  );

  const queueStats = useMemo(() => {
    const queued = syncQueue.filter((item) => item.status === "queued").length;
    const failed = syncQueue.filter((item) => item.status === "failed").length;
    const synced = syncQueue.filter((item) => item.status === "synced").length;
    return { queued, failed, synced };
  }, [syncQueue]);

  const updateRecord = useCallback(
    (recordId: string, updater: (record: DNVaststellingRecord) => DNVaststellingRecord) => {
      persistRecords((previous) => previous.map((record) => (record.id === recordId ? updater(record) : record)));
    },
    [persistRecords]
  );

  const setRecordCompletionState = useCallback(
    (recordId: string, nextState: DNVaststellingCompletionState) => {
      updateRecord(recordId, (record) => ({
        ...record,
        completionState: nextState,
        updatedAt: new Date().toISOString(),
      }));
    },
    [updateRecord]
  );

  const handleStartDraft = useCallback(
    (visit: PlannedVisit | null) => {
      if (!activeSession || !visit) {
        setSyncMessage("Geen actieve toezichter of werfcontext beschikbaar.");
        return;
      }

      const context = mapVisitToDNVaststellingContext(visit, selectedDate);
      const draft = createDNVaststellingDraft({ session: activeSession, context });
      const seededFormData = buildSeededFormDataFromVisit(schema, visit);
      const seededChecklistScore = calculateChecklistScore(seededFormData);
      const seededDraft = updateDNVaststellingMutablePayload(draft, {
        formData: seededFormData,
        metaLocation: formatAddressFromVisit(visit),
        gps: `${context.latitude.toFixed(6)}, ${context.longitude.toFixed(6)}`,
        notes: `Context geladen: ${visit.work.dossierId} / BONU ${visit.work.bonuNummer || "-"}`,
        nokCount: countNokFindings(seededFormData),
        checklistScore: seededChecklistScore.score,
        checklistScoreDetails: seededChecklistScore,
      });

      persistRecords((previous) => [seededDraft, ...previous]);
      setActiveRecordId(seededDraft.id);
      setValidationTouched(false);
      setSyncMessage(`DN Vaststelling gestart voor dossier ${context.dossierId}.`);
      onSelectVisit(visit.id);
    },
    [activeSession, onSelectVisit, persistRecords, schema, selectedDate]
  );

  const handleUseContext = useCallback(
    (visit: PlannedVisit) => {
      onSelectVisit(visit.id);

      if (!activeSession) {
        setSyncMessage("Context geselecteerd. Activeer eerst een toezichter-sessie om te starten.");
        return;
      }

      const existingRecord = records.find((record) => record.immutableContext.workId === visit.work.id);
      if (!existingRecord) {
        handleStartDraft(visit);
        return;
      }

      const seededFormData = buildSeededFormDataFromVisit(schema, visit);
      const currentFormData = getFormData(existingRecord);
      const mergedFormData: Record<string, DNVaststellingFieldValue> = { ...currentFormData };

      for (const [key, value] of Object.entries(seededFormData)) {
        if (!hasFieldValue(mergedFormData[key])) {
          mergedFormData[key] = value;
        }
      }
      const mergedChecklistScore = calculateChecklistScore(mergedFormData);

      updateRecord(existingRecord.id, (record) =>
        updateDNVaststellingMutablePayload(record, {
          formData: mergedFormData,
          metaLocation: record.mutablePayload.metaLocation || formatAddressFromVisit(visit),
          gps:
            record.mutablePayload.gps ||
            `${visit.work.location.lat.toFixed(6)}, ${visit.work.location.lng.toFixed(6)}`,
          notes:
            record.mutablePayload.notes ||
            `Context geladen: ${visit.work.dossierId} / BONU ${visit.work.bonuNummer || "-"}`,
          nokCount: countNokFindings(mergedFormData),
          checklistScore: mergedChecklistScore.score,
          checklistScoreDetails: mergedChecklistScore,
        })
      );

      setActiveRecordId(existingRecord.id);
      setValidationTouched(false);
      setSyncMessage(
        `Context gekoppeld voor dossier ${visit.work.dossierId} (BONU ${visit.work.bonuNummer || "-"})`
      );
    },
    [activeSession, handleStartDraft, onSelectVisit, records, schema, updateRecord]
  );

  const updateActiveRecordPayload = useCallback(
    (patch: Record<string, unknown>) => {
      if (!activeRecord) {
        return;
      }
      updateRecord(activeRecord.id, (record) => updateDNVaststellingMutablePayload(record, patch));
    },
    [activeRecord, updateRecord]
  );

  const handleSetFieldValue = useCallback(
    (fieldKey: string, nextValue: DNVaststellingFieldValue | undefined) => {
      if (!activeRecord) {
        return;
      }

      const nextFormData = {
        ...activeFormData,
        [fieldKey]: nextValue,
      };

      const compacted: Record<string, DNVaststellingFieldValue> = {};
      for (const [key, value] of Object.entries(nextFormData)) {
        if (typeof value === "string") {
          compacted[key] = value;
          continue;
        }
        if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
          compacted[key] = value;
        }
      }

      const checklistCouplingPatch = buildChecklistCouplingPatch({
        schema,
        formData: compacted,
        changedFieldKey: fieldKey,
        changedValue: nextValue,
        canonicalFieldKeys: CORE_CANONICAL_FIELD_KEYS,
      });
      for (const [key, value] of Object.entries(checklistCouplingPatch)) {
        compacted[key] = value;
      }
      const checklistScore = calculateChecklistScore(compacted);

      const payloadPatch: Record<string, unknown> = {
        formData: compacted,
        nokCount: countNokFindings(compacted),
        checklistScore: checklistScore.score,
        checklistScoreDetails: checklistScore,
      };

      if (isPhotoFieldKey(fieldKey)) {
        const photoUrl = typeof nextValue === "string" ? nextValue.trim() : "";
        payloadPatch.photoEvidence = upsertPhotoEvidence(
          activeRecord.mutablePayload.photoEvidence,
          {
            fieldKey,
            url: photoUrl,
            inspectionId: activeRecord.id,
            lat: activeRecord.immutableContext.latitude,
            lon: activeRecord.immutableContext.longitude,
            actorId: activeRecord.inspectorSession.inspectorId,
            actorName: activeRecord.inspectorSession.inspectorName,
            source:
              photoUrl.startsWith("mock://") || isDataImageUrl(photoUrl)
                ? "mock"
                : "api",
          }
        );
      }

      if (fieldKey === "status" && typeof nextValue === "string") {
        const previousStatus =
          typeof activeFormData.status === "string" ? activeFormData.status : "";
        const nextStatus = nextValue;

        if (previousStatus === "afgesloten" && nextStatus === "open") {
          payloadPatch.reopenTriggeredAt = new Date().toISOString();
        } else if (nextStatus !== "open") {
          payloadPatch.reopenTriggeredAt = undefined;
        }
      }

      updateActiveRecordPayload(payloadPatch);
    },
    [activeFormData, activeRecord, schema, updateActiveRecordPayload]
  );

  const handleAttachMockPhoto = useCallback(
    (fieldKey: DNVaststellingPhotoFieldKey) => {
      if (!activeRecord) {
        return;
      }
      const mockUrl = buildMockPhotoUrl(activeRecord.id, fieldKey);
      handleSetFieldValue(fieldKey, mockUrl);
      setSyncMessage(`Mock foto gekoppeld voor ${fieldKey}.`);
    },
    [activeRecord, handleSetFieldValue]
  );

  const handleAttachPhotoFile = useCallback(
    async (fieldKey: DNVaststellingPhotoFieldKey, file: File | null) => {
      if (!activeRecord || !file) {
        return;
      }

      try {
        if (!file.type.startsWith("image/")) {
          setSyncMessage("Selecteer een geldig afbeeldingsbestand.");
          return;
        }

        const rawDataUrl = await readFileAsDataUrl(file);
        if (!isAnyDataImageUrl(rawDataUrl)) {
          setSyncMessage("Bestandsformaat niet ondersteund als afbeelding.");
          return;
        }

        const optimized = await optimizeImageForStorage(rawDataUrl);
        if (optimized.bytes > MAX_PHOTO_EXPORT_BYTES) {
          setSyncMessage(
            `Foto blijft te groot na optimalisatie (${formatBytes(optimized.bytes)}). Kies een kleinere foto.`
          );
          return;
        }

        handleSetFieldValue(fieldKey, optimized.dataUrl);
        setSyncMessage(
          `Foto toegevoegd voor ${fieldKey} (${formatBytes(optimized.bytes)}).`
        );
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : "Foto upload mislukt.");
      }
    },
    [activeRecord, handleSetFieldValue]
  );

  const markRecordAsValid = useCallback(() => {
    if (!activeRecord || !validation) {
      return;
    }

    setValidationTouched(true);
    if (!validation.isValid) {
      setSyncMessage("Validatie niet geslaagd. Vul ontbrekende velden aan.");
      return;
    }

    setRecordCompletionState(activeRecord.id, "valid");
    setSyncMessage("Vaststelling staat op VALID en is klaar voor wachtrij/sync.");
  }, [activeRecord, setRecordCompletionState, validation]);

  const runSyncQueue = useCallback(
    async (queueToSync: DNVaststellingSyncItem[], startMessage: string) => {
      if (!activeSession) {
        setSyncMessage("Geen actieve toezichter. Start eerst een sessie.");
        return null;
      }

      if (syncRunning) {
        return null;
      }

      setSyncRunning(true);
      setSyncMessage(startMessage);

      try {
        const result = await runDNVaststellingSyncBatch(
          queueToSync,
          {
            endpoint: syncEndpoint,
            autoSyncOnOnline,
            requestTimeoutMs,
          },
          { deviceId: activeSession.deviceId }
        );

        setSyncQueue(result.updatedQueue);
        await saveDNVaststellingSyncQueue(result.updatedQueue);

        const syncedRecordIds = new Set(
          result.updatedQueue
            .filter((item) => item.status === "synced")
            .map((item) => (typeof item.payload.inspectionId === "string" ? item.payload.inspectionId : ""))
            .filter((id) => id.length > 0)
        );

        if (syncedRecordIds.size > 0) {
          persistRecords((previous) =>
            previous.map((record) =>
              syncedRecordIds.has(record.id)
                ? { ...record, completionState: "synced", updatedAt: new Date().toISOString() }
                : record
            )
          );
        }

        return result;
      } catch (error) {
        setSyncMessage(error instanceof Error ? error.message : "Sync mislukt.");
        return null;
      } finally {
        setSyncRunning(false);
      }
    },
    [
      activeSession,
      autoSyncOnOnline,
      persistRecords,
      requestTimeoutMs,
      syncEndpoint,
      syncRunning,
    ]
  );

  const queueRecordForSync = useCallback(async () => {
    if (!activeRecord || !validation) {
      return;
    }

    setValidationTouched(true);
    if (!validation.isValid) {
      setSyncMessage("Kan niet in wachtrij: validatie bevat nog fouten.");
      return;
    }

    const queuedRecord: DNVaststellingRecord = {
      ...activeRecord,
      completionState: "queued",
      updatedAt: new Date().toISOString(),
    };

    persistRecords((previous) =>
      previous.map((record) => (record.id === queuedRecord.id ? queuedRecord : record))
    );
    const nextQueue = enqueueInspectionSync(syncQueue, queuedRecord);
    setSyncQueue(nextQueue);
    await saveDNVaststellingSyncQueue(nextQueue);

    if (autoSyncOnOnline && typeof navigator !== "undefined" && navigator.onLine) {
      const result = await runSyncQueue(nextQueue, "Dual-write sync gestart...");
      if (result) {
        setSyncMessage(
          `Dual-write resultaat: ${result.syncedCount} geslaagd, ${result.failedCount} mislukt.`
        );
      }
      return;
    }

    setSyncMessage("Vaststelling toegevoegd aan sync-wachtrij.");
  }, [
    activeRecord,
    autoSyncOnOnline,
    persistRecords,
    runSyncQueue,
    syncQueue,
    validation,
  ]);

  const handleExportPdf = useCallback(() => {
    if (!activeRecord) {
      setSyncMessage("Geen actieve vaststelling om te exporteren.");
      return;
    }

    exportDNVaststellingPdf({
      record: activeRecord,
      schema,
      validation,
    });

    setSyncMessage(
      `PDF rapport aangemaakt voor BONU ${activeRecord.immutableContext.bonuNummer || activeRecord.immutableContext.dossierId}.`
    );
  }, [activeRecord, schema, validation]);

  const handleSyncNow = useCallback(async () => {
    const result = await runSyncQueue(syncQueue, "Sync gestart...");
    if (result) {
      setSyncMessage(result.message);
    }
  }, [runSyncQueue, syncQueue]);

  useEffect(() => {
    if (!autoSyncOnOnline) {
      return;
    }

    const onOnline = () => {
      void handleSyncNow();
    };

    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [autoSyncOnOnline, handleSyncNow]);

  const handleSessionStart = () => {
    if (!sessionSelectId) {
      return;
    }
    onSwitchSession(sessionSelectId);
  };

  return (
    <main className="view-shell">
      <section className="view-card">
        <h2>DN Vaststelling</h2>
        <p className="view-subtitle">
          Terreinmodus met verplichte toezichter-sessie, schema-gedreven inspectievelden en sync-wachtrij.
        </p>
      </section>

      <section className="view-card">
        <h3>Actieve sessie</h3>
        <div className="quick-actions">
          <select
            value={sessionSelectId}
            onChange={(event) => setSessionSelectId(event.target.value)}
            aria-label="Toezichter sessie"
          >
            {inspectors.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.initials} - {inspector.name || `Toezichter ${inspector.initials}`}
              </option>
            ))}
          </select>
          <button type="button" className="secondary-btn" onClick={handleSessionStart}>
            Activeer sessie
          </button>
        </div>
        {activeSession ? (
          <p className="muted-note">
            Actief: <strong>{activeSession.inspectorName}</strong> ({activeSession.inspectorInitials})
          </p>
        ) : (
          <p className="warning-inline">Geen actieve toezichter. Activeer eerst een sessie.</p>
        )}
      </section>

      <section className="view-card">
        <h3>Mijn lijst vandaag ({myVisits.length})</h3>
        {myVisits.length === 0 ? (
          <p className="muted-note">Geen toegewezen bezoeken in huidige filtercontext.</p>
        ) : (
          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>BONU</th>
                  <th>Dossier</th>
                  <th>Type</th>
                  <th>Adres</th>
                  <th>Nutsmaatschappij</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {myVisits.slice(0, 30).map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.work.bonuNummer || "-"}</td>
                    <td>{visit.work.dossierId}</td>
                    <td>{visit.visitType}</td>
                    <td>{formatAddressFromVisit(visit)}</td>
                    <td>{visit.work.nutsBedrijf || "-"}</td>
                    <td>
                      <div className="quick-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleUseContext(visit)}
                        >
                          Gebruik context
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          onClick={() => handleStartDraft(visit)}
                        >
                          Start vaststelling
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {effectiveVisit ? (
          <p className="muted-note">Actieve context: {effectiveVisit.work.dossierId}</p>
        ) : null}
      </section>

      <section className="view-card">
        <div className="group-head-row">
          <h3>Actieve vaststelling</h3>
          {activeRecord ? <span className="visit-chip">{statusLabel(activeRecord.completionState)}</span> : null}
        </div>

        {!activeRecord ? (
          <>
            <p className="muted-note">Nog geen actieve vaststelling. Start vanaf een item uit "Mijn lijst".</p>
            <div className="quick-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => handleStartDraft(effectiveVisit)}
                disabled={!effectiveVisit}
              >
                Start van geselecteerde context
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="vaststelling-meta-grid">
              <p>
                <strong>Dossier:</strong> {activeRecord.immutableContext.dossierId}
              </p>
              <p>
                <strong>BONU:</strong> {activeRecord.immutableContext.bonuNummer || "-"}
              </p>
              <p>
                <strong>Adres:</strong> {activeRecord.immutableContext.straat} {activeRecord.immutableContext.huisnr},{" "}
                {activeRecord.immutableContext.postcode} {activeRecord.immutableContext.district}
              </p>
              <p>
                <strong>Nutsmaatschappij:</strong> {activeRecord.immutableContext.nutsBedrijf || "-"}
              </p>
              <p>
                <strong>GW nr (Referentie):</strong> {activeRecord.immutableContext.referentieId || "-"}
              </p>
              <p>
                <strong>GIPOD nr:</strong> {activeRecord.immutableContext.gipodId || "-"}
              </p>
              <p>
                <strong>Toezichter:</strong> {activeRecord.inspectorSession.inspectorName}
              </p>
              <p>
                <strong>Checklistscore:</strong>{" "}
                {typeof activeRecord.mutablePayload.checklistScore === "number"
                  ? Math.round(activeRecord.mutablePayload.checklistScore)
                  : calculateChecklistScore(activeFormData).score}
                /100
              </p>
            </div>

            <div className="dnv-meta-inputs">
              <label>
                Locatie
                <input
                  className={`dnv-input ${
                    validationTouched && issueInputKeys.has("__meta__location") ? "dnv-input-danger" : ""
                  }`}
                  value={activeRecord.mutablePayload.metaLocation ?? ""}
                  onChange={(event) => updateActiveRecordPayload({ metaLocation: event.target.value })}
                />
              </label>
              <label>
                GPS
                <input
                  className="dnv-input"
                  value={activeRecord.mutablePayload.gps ?? ""}
                  onChange={(event) => updateActiveRecordPayload({ gps: event.target.value })}
                />
              </label>
              <label>
                Extra nota
                <textarea
                  className="dnv-input dnv-textarea"
                  value={activeRecord.mutablePayload.notes ?? ""}
                  onChange={(event) => updateActiveRecordPayload({ notes: event.target.value })}
                />
              </label>
            </div>

            <div className="roadmap-list">
              {schema.sections.map((section) => {
                const isExpanded = expandedSectionIds[section.id] ?? section.id === schema.sections[0]?.id;

                return (
                  <article key={section.id} className="roadmap-item">
                    <button
                      type="button"
                      className="dnv-section-toggle"
                      onClick={() =>
                        setExpandedSectionIds((previous) => ({
                          ...previous,
                          [section.id]: !isExpanded,
                        }))
                      }
                    >
                      {isExpanded ? "▼" : "▶"} {section.title}
                    </button>

                    {isExpanded ? (
                      <div className="dnv-section-body">
                        {section.items.map((field) => {
                          const value = activeFormData[field.key];
                          const photoEvidence = isPhotoFieldKey(field.key)
                            ? findPhotoEvidenceByField(activeRecord.mutablePayload.photoEvidence, field.key)
                            : null;
                          const showResponsible =
                            (typeof value === "string" && isNokValue(value)) ||
                            (Array.isArray(value) && value.some((entry) => isNokValue(entry)));

                          return (
                            <div key={field.key} className="dnv-field">
                              <label className="dnv-label">
                                {field.label} {field.required ? <span className="dnv-required">*</span> : null}
                              </label>
                              {field.hint ? <p className="muted-note">{field.hint}</p> : null}

                              {field.type === "textarea" ? (
                                <textarea
                                  className={`dnv-input dnv-textarea ${
                                    validationTouched && issueInputKeys.has(field.key)
                                      ? "dnv-input-danger"
                                      : ""
                                  }`}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => handleSetFieldValue(field.key, event.target.value)}
                                />
                              ) : field.type === "select" ? (
                                <select
                                  className={`dnv-input ${
                                    validationTouched && issueInputKeys.has(field.key)
                                      ? "dnv-input-danger"
                                      : ""
                                  }`}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => handleSetFieldValue(field.key, event.target.value)}
                                >
                                  <option value="">Selecteer...</option>
                                  {(field.options ?? []).map((option) => (
                                    <option key={option.value} value={option.label}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              ) : field.type === "multiselect" ? (
                                <div className="dnv-multi-grid">
                                  {(field.options ?? []).map((option) => {
                                    const selectedValues = Array.isArray(value) ? value : [];
                                    const checked = selectedValues.includes(option.label);

                                    return (
                                      <label key={option.value} className="dnv-multi-item">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(event) => {
                                            const previousValues = Array.isArray(value) ? [...value] : [];
                                            if (event.target.checked) {
                                              if (option.label === "OK") {
                                                handleSetFieldValue(field.key, ["OK"]);
                                                return;
                                              }
                                              const withoutOk = previousValues.filter((entry) => entry !== "OK");
                                              handleSetFieldValue(field.key, [...withoutOk, option.label]);
                                              return;
                                            }

                                            handleSetFieldValue(
                                              field.key,
                                              previousValues.filter((entry) => entry !== option.label)
                                            );
                                          }}
                                        />
                                        <span>{option.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              ) : isPhotoFieldKey(field.key) ? (
                                <>
                                  <input
                                    className={`dnv-input ${
                                      validationTouched && issueInputKeys.has(field.key)
                                        ? "dnv-input-danger"
                                        : ""
                                    }`}
                                    value={summarizePhotoValue(typeof value === "string" ? value : "")}
                                    readOnly
                                  />
                                  <div className="quick-actions">
                                    <label className="secondary-btn dnv-file-upload-btn">
                                      Neem/kies foto
                                      <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        onChange={(event) => {
                                          const file = event.currentTarget.files?.[0] ?? null;
                                          event.currentTarget.value = "";
                                          void handleAttachPhotoFile(
                                            field.key as DNVaststellingPhotoFieldKey,
                                            file
                                          );
                                        }}
                                      />
                                    </label>
                                    <button
                                      type="button"
                                      className="secondary-btn"
                                      onClick={() => {
                                        const existing =
                                          typeof value === "string" ? value : "";
                                        const manualUrl = window.prompt(
                                          "Plak foto-URL (optioneel geavanceerd):",
                                          existing
                                        );
                                        if (manualUrl === null) {
                                          return;
                                        }
                                        handleSetFieldValue(field.key, manualUrl.trim());
                                      }}
                                    >
                                      Plak URL
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary-btn"
                                      onClick={() =>
                                        handleAttachMockPhoto(field.key as DNVaststellingPhotoFieldKey)
                                      }
                                    >
                                      Voeg mock foto toe
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary-btn"
                                      onClick={() => handleSetFieldValue(field.key, "")}
                                    >
                                      Verwijder foto
                                    </button>
                                  </div>
                                  {typeof value === "string" && isDataImageUrl(value) ? (
                                    <img
                                      className="dnv-photo-preview"
                                      src={value}
                                      alt={`Preview ${field.label}`}
                                      loading="lazy"
                                    />
                                  ) : null}
                                  {typeof value === "string" &&
                                  value.trim().length > 0 &&
                                  !isDataImageUrl(value) ? (
                                    <p className="muted-note">
                                      Tip: gebruik Upload of mock-foto om deze afbeelding mee in PDF te embedden.
                                    </p>
                                  ) : null}
                                  {photoEvidence ? (
                                    <p className="muted-note">
                                      Evidence: {photoEvidence.photoId} |{" "}
                                      {new Date(photoEvidence.takenAt).toLocaleString("nl-BE")} | hash{" "}
                                      {photoEvidence.hash}
                                    </p>
                                  ) : null}
                                </>
                              ) : (
                                <input
                                  className={`dnv-input ${
                                    validationTouched && issueInputKeys.has(field.key)
                                      ? "dnv-input-danger"
                                      : ""
                                  }`}
                                  value={typeof value === "string" ? value : ""}
                                  onChange={(event) => handleSetFieldValue(field.key, event.target.value)}
                                />
                              )}

                              {showResponsible && Array.isArray(value)
                                ? value
                                    .filter((entry) => isNokValue(entry))
                                    .map((entry) => {
                                      const responsibleKey = `${field.key}__responsible__${entry}`;
                                      const responsibleValue = activeFormData[responsibleKey];
                                      return (
                                        <label key={responsibleKey} className="dnv-responsible-row">
                                          <span>Verantwoordelijke voor {entry}</span>
                                          <select
                                            className={`dnv-input ${
                                              validationTouched && issueInputKeys.has(responsibleKey)
                                                ? "dnv-input-danger"
                                                : ""
                                            }`}
                                            value={typeof responsibleValue === "string" ? responsibleValue : ""}
                                            onChange={(event) =>
                                              handleSetFieldValue(responsibleKey, event.target.value)
                                            }
                                          >
                                            <option value="">Selecteer partij...</option>
                                            {RESPONSIBLE_PARTIES.map((party) => (
                                              <option key={party} value={party}>
                                                {party}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      );
                                    })
                                : null}

                              {showResponsible && typeof value === "string" ? (
                                <label className="dnv-responsible-row">
                                  <span>Verantwoordelijke</span>
                                  <select
                                    className={`dnv-input ${
                                      validationTouched && issueInputKeys.has(`${field.key}__responsible`)
                                        ? "dnv-input-danger"
                                        : ""
                                    }`}
                                    value={
                                      typeof activeFormData[`${field.key}__responsible`] === "string"
                                        ? activeFormData[`${field.key}__responsible`]
                                        : ""
                                    }
                                    onChange={(event) =>
                                      handleSetFieldValue(`${field.key}__responsible`, event.target.value)
                                    }
                                  >
                                    <option value="">Selecteer partij...</option>
                                    {RESPONSIBLE_PARTIES.map((party) => (
                                      <option key={party} value={party}>
                                        {party}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}

                              {field.notes && field.notes.length > 0 ? (
                                <div className="muted-note">{field.notes.join(" | ")}</div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <div className="dnv-actions">
              <label>
                Handover
                <select
                  className="dnv-input"
                  value={activeRecord.mutablePayload.handoverDecision ?? ""}
                  onChange={(event) =>
                    updateActiveRecordPayload({
                      handoverDecision: event.target.value || undefined,
                    })
                  }
                >
                  <option value="">Geen keuze</option>
                  <option value="BLOCK">BLOCK</option>
                  <option value="REQUEST_FIX">REQUEST_FIX</option>
                  <option value="APPROVE">APPROVE</option>
                </select>
              </label>
              <label>
                Handover nota
                <textarea
                  className="dnv-input dnv-textarea"
                  value={activeRecord.mutablePayload.handoverDecisionNote ?? ""}
                  onChange={(event) =>
                    updateActiveRecordPayload({ handoverDecisionNote: event.target.value })
                  }
                />
              </label>
              <div className="quick-actions">
                <button type="button" className="secondary-btn" onClick={handleExportPdf}>
                  Download PDF rapport
                </button>
                <button type="button" className="secondary-btn" onClick={markRecordAsValid}>
                  Markeer als valid
                </button>
                <button type="button" className="secondary-btn" onClick={queueRecordForSync}>
                  Zet in wachtrij
                </button>
              </div>
            </div>

            {validationTouched && validation && !validation.isValid ? (
              <div className="warning-inline">
                Openstaande fouten: {validation.metaIssues} metadata, {validation.requiredFieldIssues} verplichte velden,{" "}
                {validation.nokResponsibleIssues} NOK-verantwoordelijken.
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="view-card">
        <h3>Sync Center</h3>
        <div className="quick-actions">
          <span className="visit-chip">Queued: {queueStats.queued}</span>
          <span className="visit-chip">Failed: {queueStats.failed}</span>
          <span className="visit-chip">Synced: {queueStats.synced}</span>
          <button type="button" className="secondary-btn" onClick={onDemoReset}>
            Demo reset
          </button>
        </div>
        <div className="dnv-sync-settings">
          <label>
            Endpoint
            <input
              className="dnv-input"
              value={syncEndpoint}
              onChange={(event) => setSyncEndpoint(event.target.value)}
              onBlur={() =>
                saveSyncSettings({
                  endpoint: syncEndpoint,
                  autoSyncOnOnline,
                  requestTimeoutMs,
                })
              }
            />
          </label>
          <label className="toggle-inline">
            <input
              type="checkbox"
              checked={autoSyncOnOnline}
              onChange={(event) => {
                const next = event.target.checked;
                saveSyncSettings({
                  endpoint: syncEndpoint,
                  autoSyncOnOnline: next,
                  requestTimeoutMs,
                });
              }}
            />
            Auto sync bij online
          </label>
          <label>
            Timeout (ms)
            <input
              type="number"
              min={1000}
              step={500}
              className="dnv-input"
              value={requestTimeoutMs}
              onChange={(event) => setRequestTimeoutMs(Number(event.target.value) || 15000)}
              onBlur={() =>
                saveSyncSettings({
                  endpoint: syncEndpoint,
                  autoSyncOnOnline,
                  requestTimeoutMs: Math.max(1000, requestTimeoutMs),
                })
              }
            />
          </label>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => void handleSyncNow()}
            disabled={syncRunning}
          >
            {syncRunning ? "Synchronisatie bezig..." : "Synchroniseer nu"}
          </button>
        </div>
        {syncMessage ? <p className="muted-note">{syncMessage}</p> : null}

        {syncQueue.length === 0 ? (
          <p className="muted-note">Geen sync-items in wachtrij.</p>
        ) : (
          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Server</th>
                  <th>Mapped status</th>
                  <th>Pogingen</th>
                  <th>Laatste fout</th>
                  <th>Laatste poging</th>
                </tr>
              </thead>
              <tbody>
                {syncQueue.slice(0, 50).map((item) => (
                  <tr key={item.id}>
                    <td>{item.type}</td>
                    <td>{item.status}</td>
                    <td>{item.serverOutcome ?? "-"}</td>
                    <td>{item.serverMappedStatus ?? "-"}</td>
                    <td>{item.attempts}</td>
                    <td>{item.lastError || "-"}</td>
                    <td>{item.lastAttemptAt ? new Date(item.lastAttemptAt).toLocaleString("nl-BE") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="view-card">
        <h3>Recente vaststellingen ({records.length})</h3>
        {records.length === 0 ? (
          <p className="muted-note">Nog geen records gestart.</p>
        ) : (
          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Score</th>
                  <th>BONU</th>
                  <th>Dossier</th>
                  <th>Toezichter</th>
                  <th>Laatste update</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 50).map((record) => (
                  <tr key={record.id}>
                    <td>{statusLabel(record.completionState)}</td>
                    <td>{resolveChecklistScoreLabel(record)}/100</td>
                    <td>{record.immutableContext.bonuNummer || "-"}</td>
                    <td>{record.immutableContext.dossierId}</td>
                    <td>{record.inspectorSession.inspectorName}</td>
                    <td>{new Date(record.updatedAt).toLocaleString("nl-BE")}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => {
                          setActiveRecordId(record.id);
                          setValidationTouched(false);
                        }}
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

