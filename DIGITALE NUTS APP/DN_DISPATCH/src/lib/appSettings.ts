import { HOLIDAYS } from "../config/holidays";
import { INSPECTORS } from "../config/inspectors";
import type {
  DispatchCapacitySettings,
  DispatchSettings,
  Inspector,
  InspectorAbsenceRange,
  InspectorCapacityOverride,
} from "../types";

export const SETTINGS_STORAGE_KEY = "dn_dispatch_settings_v1";
export const MIN_SYNC_INTERVAL_MINUTES = 15;
export const MAX_SYNC_INTERVAL_MINUTES = 720;
export const DEFAULT_SYNC_INTERVAL_MINUTES = 60;
export const MIN_DAILY_LIMIT = 1;
export const MAX_DAILY_LIMIT = 20;
export const MIN_VISIT_WEIGHT = 0.25;
export const MAX_VISIT_WEIGHT = 4;
export const MIN_FIXED_DAILY_LOAD = 0;
export const MAX_FIXED_DAILY_LOAD = 12;
export const MIN_EXPERIENCE_FACTOR = 0.5;
export const MAX_EXPERIENCE_FACTOR = 1.5;
export const DEFAULT_SOFT_DAILY_LIMIT = 5;
export const DEFAULT_HARD_DAILY_LIMIT = 6;
export const DEFAULT_STANDARD_VISIT_WEIGHT = 1;
export const DEFAULT_COMPLEX_VISIT_WEIGHT = 1.5;

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const POSTCODE_REGEX = /^\d{4}$/;
const INSPECTOR_ID_REGEX = /^I\d+$/i;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const CUSTOM_INSPECTOR_COLOR_PALETTE = [
  "#264653",
  "#2a9d8f",
  "#e9c46a",
  "#f4a261",
  "#e76f51",
  "#8ab17d",
  "#457b9d",
  "#6d597a",
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundNumber(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeText(value: unknown): string {
  return `${value ?? ""}`.trim();
}

function isIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  return parsed.toISOString().slice(0, 10) === value;
}

function normalizeOptionalIsoDate(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }
  return isIsoDate(normalized) ? normalized : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  const normalized = normalizeText(value);
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}

function normalizeActiveWindow(
  activeFrom: string | undefined,
  activeUntil: string | undefined
): { activeFrom?: string; activeUntil?: string } {
  if (activeFrom && activeUntil && activeFrom > activeUntil) {
    return {
      activeFrom: activeUntil,
      activeUntil: activeFrom,
    };
  }
  return { activeFrom, activeUntil };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) {
      return false;
    }
  }

  return true;
}

function normalizePostcodeList(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(
    values
      .map((item) => `${item ?? ""}`.trim())
      .filter((item) => POSTCODE_REGEX.test(item))
  )].sort((a, b) => a.localeCompare(b, "nl", { numeric: true }));
}

function normalizeHolidayDates(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [...HOLIDAYS];
  }

  const normalized = values
    .map((item) => `${item ?? ""}`.trim())
    .filter((item) => isIsoDate(item));

  if (normalized.length === 0) {
    return [...HOLIDAYS];
  }

  return [...new Set(normalized)].sort((a, b) => a.localeCompare(b));
}

function normalizeAbsenceRanges(values: unknown): InspectorAbsenceRange[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const parsed = values
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const startDate = normalizeText(raw.startDate);
      const endDate = normalizeText(raw.endDate);

      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        return null;
      }

      const rangeStart = startDate <= endDate ? startDate : endDate;
      const rangeEnd = startDate <= endDate ? endDate : startDate;

      return {
        startDate: rangeStart,
        endDate: rangeEnd,
      } as InspectorAbsenceRange;
    })
    .filter((entry): entry is InspectorAbsenceRange => Boolean(entry));

  if (parsed.length === 0) {
    return [];
  }

  parsed.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.endDate.localeCompare(b.endDate);
  });

  const merged: InspectorAbsenceRange[] = [];

  for (const current of parsed) {
    const previous = merged[merged.length - 1];
    if (!previous) {
      merged.push(current);
      continue;
    }

    if (current.startDate <= previous.endDate) {
      if (current.endDate > previous.endDate) {
        previous.endDate = current.endDate;
      }
      continue;
    }

    merged.push(current);
  }

  return merged;
}

function sanitizeCustomInspectorColor(color: unknown, fallbackIndex: number): string {
  const normalized = normalizeText(color);
  if (HEX_COLOR_REGEX.test(normalized)) {
    return normalized;
  }
  return CUSTOM_INSPECTOR_COLOR_PALETTE[fallbackIndex % CUSTOM_INSPECTOR_COLOR_PALETTE.length];
}

function normalizeCustomInspectors(values: unknown): Inspector[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const takenIds = new Set(INSPECTORS.map((inspector) => inspector.id.toUpperCase()));
  const custom: Inspector[] = [];

  for (const entry of values) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const raw = entry as Record<string, unknown>;
    const id = normalizeText(raw.id).toUpperCase();
    if (!id || !INSPECTOR_ID_REGEX.test(id) || takenIds.has(id)) {
      continue;
    }

    const initials = normalizeText(raw.initials).toUpperCase();
    const primaryPostcodes = normalizePostcodeList(raw.primaryPostcodes);
    const backupPostcodes = normalizePostcodeList(raw.backupPostcodes);

    if (!initials || primaryPostcodes.length === 0) {
      continue;
    }

    const window = normalizeActiveWindow(
      normalizeOptionalIsoDate(raw.activeFrom),
      normalizeOptionalIsoDate(raw.activeUntil)
    );
    const name = normalizeText(raw.name) || `Toezichter ${initials}`;
    const isReserve = typeof raw.isReserve === "boolean" ? raw.isReserve : true;

    custom.push({
      id,
      initials,
      name,
      color: sanitizeCustomInspectorColor(raw.color, custom.length),
      primaryPostcodes,
      backupPostcodes,
      isReserve,
      activeFrom: window.activeFrom,
      activeUntil: window.activeUntil,
    });
    takenIds.add(id);
  }

  return custom.sort((a, b) => a.id.localeCompare(b.id, "nl", { numeric: true }));
}

function normalizeInspectorOverrides(
  values: unknown,
  referenceInspectors: Inspector[]
): DispatchSettings["inspectorOverrides"] {
  const result: DispatchSettings["inspectorOverrides"] = {};

  if (!values || typeof values !== "object") {
    return result;
  }

  for (const inspector of referenceInspectors) {
    const rawEntry = (values as Record<string, unknown>)[inspector.id];
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const raw = rawEntry as Record<string, unknown>;
    const initials = normalizeText(raw.initials).toUpperCase();
    const name = normalizeText(raw.name);
    const hasPrimaryPostcodes = Array.isArray(raw.primaryPostcodes);
    const hasBackupPostcodes = Array.isArray(raw.backupPostcodes);
    const primaryPostcodes = hasPrimaryPostcodes
      ? normalizePostcodeList(raw.primaryPostcodes)
      : inspector.primaryPostcodes;
    const backupPostcodes = hasBackupPostcodes
      ? normalizePostcodeList(raw.backupPostcodes)
      : inspector.backupPostcodes;

    const hasReserveFlag = typeof raw.isReserve === "boolean";
    const isReserve = hasReserveFlag
      ? (raw.isReserve as boolean)
      : inspector.isReserve ?? false;

    const hasActiveFrom = Object.prototype.hasOwnProperty.call(raw, "activeFrom");
    const hasActiveUntil = Object.prototype.hasOwnProperty.call(raw, "activeUntil");
    const activeWindow = normalizeActiveWindow(
      hasActiveFrom ? normalizeOptionalIsoDate(raw.activeFrom) : inspector.activeFrom,
      hasActiveUntil ? normalizeOptionalIsoDate(raw.activeUntil) : inspector.activeUntil
    );

    const hasDifference =
      (initials.length > 0 && initials !== inspector.initials) ||
      (name.length > 0 && name !== (inspector.name ?? `Toezichter ${inspector.initials}`)) ||
      (hasPrimaryPostcodes && !arraysEqual(primaryPostcodes, inspector.primaryPostcodes)) ||
      (hasBackupPostcodes && !arraysEqual(backupPostcodes, inspector.backupPostcodes)) ||
      (hasReserveFlag && isReserve !== (inspector.isReserve ?? false)) ||
      (hasActiveFrom && (activeWindow.activeFrom ?? "") !== (inspector.activeFrom ?? "")) ||
      (hasActiveUntil && (activeWindow.activeUntil ?? "") !== (inspector.activeUntil ?? ""));

    if (!hasDifference) {
      continue;
    }

    result[inspector.id] = {
      initials: initials || undefined,
      name: name || undefined,
      primaryPostcodes:
        !hasPrimaryPostcodes || arraysEqual(primaryPostcodes, inspector.primaryPostcodes)
          ? undefined
          : primaryPostcodes,
      backupPostcodes:
        !hasBackupPostcodes || arraysEqual(backupPostcodes, inspector.backupPostcodes)
          ? undefined
          : backupPostcodes,
      isReserve:
        hasReserveFlag && isReserve !== (inspector.isReserve ?? false)
          ? isReserve
          : undefined,
      activeFrom:
        hasActiveFrom && (activeWindow.activeFrom ?? "") !== (inspector.activeFrom ?? "")
          ? activeWindow.activeFrom
          : undefined,
      activeUntil:
        hasActiveUntil && (activeWindow.activeUntil ?? "") !== (inspector.activeUntil ?? "")
          ? activeWindow.activeUntil
          : undefined,
    };
  }

  return result;
}

function normalizeInspectorAbsences(
  values: unknown,
  referenceInspectors: Inspector[]
): DispatchSettings["inspectorAbsences"] {
  const result: DispatchSettings["inspectorAbsences"] = {};

  if (!values || typeof values !== "object") {
    return result;
  }

  for (const inspector of referenceInspectors) {
    const rawEntry = (values as Record<string, unknown>)[inspector.id];
    const ranges = normalizeAbsenceRanges(rawEntry);
    if (ranges.length === 0) {
      continue;
    }

    result[inspector.id] = ranges;
  }

  return result;
}

export function createDefaultDispatchCapacitySettings(): DispatchCapacitySettings {
  return {
    softDailyLimit: DEFAULT_SOFT_DAILY_LIMIT,
    hardDailyLimit: DEFAULT_HARD_DAILY_LIMIT,
    standardVisitWeight: DEFAULT_STANDARD_VISIT_WEIGHT,
    complexVisitWeight: DEFAULT_COMPLEX_VISIT_WEIGHT,
    inspectorOverrides: {},
  };
}

function normalizeInspectorCapacityOverrides(
  values: unknown,
  referenceInspectors: Inspector[],
  defaults: DispatchCapacitySettings
): DispatchCapacitySettings["inspectorOverrides"] {
  const result: DispatchCapacitySettings["inspectorOverrides"] = {};

  if (!values || typeof values !== "object") {
    return result;
  }

  for (const inspector of referenceInspectors) {
    const rawEntry = (values as Record<string, unknown>)[inspector.id];
    if (!rawEntry || typeof rawEntry !== "object") {
      continue;
    }

    const raw = rawEntry as Record<string, unknown>;

    const softCandidate = normalizeOptionalNumber(raw.softDailyLimit);
    const softDailyLimit =
      softCandidate === undefined
        ? undefined
        : clamp(Math.round(softCandidate), MIN_DAILY_LIMIT, MAX_DAILY_LIMIT);

    const hardCandidate = normalizeOptionalNumber(raw.hardDailyLimit);
    const baseHardLimit = softDailyLimit ?? defaults.softDailyLimit;
    const hardDailyLimit =
      hardCandidate === undefined
        ? undefined
        : clamp(Math.round(hardCandidate), baseHardLimit, MAX_DAILY_LIMIT);

    const fixedCandidate = normalizeOptionalNumber(raw.fixedDailyLoad);
    const fixedDailyLoad =
      fixedCandidate === undefined
        ? undefined
        : roundNumber(clamp(fixedCandidate, MIN_FIXED_DAILY_LOAD, MAX_FIXED_DAILY_LOAD), 2);

    const experienceCandidate = normalizeOptionalNumber(raw.experienceFactor);
    const experienceFactor =
      experienceCandidate === undefined
        ? undefined
        : roundNumber(
            clamp(experienceCandidate, MIN_EXPERIENCE_FACTOR, MAX_EXPERIENCE_FACTOR),
            2
          );

    const next: InspectorCapacityOverride = {
      softDailyLimit,
      hardDailyLimit,
      fixedDailyLoad,
      experienceFactor,
    };

    if (
      next.softDailyLimit === undefined &&
      next.hardDailyLimit === undefined &&
      next.fixedDailyLoad === undefined &&
      next.experienceFactor === undefined
    ) {
      continue;
    }

    result[inspector.id] = next;
  }

  return result;
}

function normalizeDispatchCapacity(
  value: unknown,
  referenceInspectors: Inspector[]
): DispatchCapacitySettings {
  const defaults = createDefaultDispatchCapacitySettings();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  const raw = value as Record<string, unknown>;

  const softCandidate = normalizeOptionalNumber(raw.softDailyLimit);
  const softDailyLimit =
    softCandidate === undefined
      ? defaults.softDailyLimit
      : clamp(Math.round(softCandidate), MIN_DAILY_LIMIT, MAX_DAILY_LIMIT);

  const hardCandidate = normalizeOptionalNumber(raw.hardDailyLimit);
  const hardDailyLimit =
    hardCandidate === undefined
      ? defaults.hardDailyLimit
      : clamp(Math.round(hardCandidate), softDailyLimit, MAX_DAILY_LIMIT);

  const standardCandidate = normalizeOptionalNumber(raw.standardVisitWeight);
  const standardVisitWeight =
    standardCandidate === undefined
      ? defaults.standardVisitWeight
      : roundNumber(clamp(standardCandidate, MIN_VISIT_WEIGHT, MAX_VISIT_WEIGHT), 2);

  const complexCandidate = normalizeOptionalNumber(raw.complexVisitWeight);
  const complexVisitWeight =
    complexCandidate === undefined
      ? defaults.complexVisitWeight
      : roundNumber(
          clamp(complexCandidate, standardVisitWeight, MAX_VISIT_WEIGHT),
          2
        );

  const effectiveDefaults: DispatchCapacitySettings = {
    softDailyLimit,
    hardDailyLimit,
    standardVisitWeight,
    complexVisitWeight,
    inspectorOverrides: {},
  };

  return {
    ...effectiveDefaults,
    inspectorOverrides: normalizeInspectorCapacityOverrides(
      raw.inspectorOverrides,
      referenceInspectors,
      effectiveDefaults
    ),
  };
}

export function createDefaultDispatchSettings(): DispatchSettings {
  return {
    holidays: [...HOLIDAYS],
    customInspectors: [],
    inspectorOverrides: {},
    inspectorAbsences: {},
    dispatchCapacity: createDefaultDispatchCapacitySettings(),
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: DEFAULT_SYNC_INTERVAL_MINUTES,
  };
}

export function sanitizeDispatchSettings(raw: unknown): DispatchSettings {
  const defaults = createDefaultDispatchSettings();

  if (!raw || typeof raw !== "object") {
    return defaults;
  }

  const candidate = raw as Record<string, unknown>;
  const autoSyncEnabled =
    typeof candidate.autoSyncEnabled === "boolean"
      ? candidate.autoSyncEnabled
      : defaults.autoSyncEnabled;

  const intervalCandidate =
    typeof candidate.autoSyncIntervalMinutes === "number"
      ? candidate.autoSyncIntervalMinutes
      : Number(candidate.autoSyncIntervalMinutes);

  const autoSyncIntervalMinutes = Number.isFinite(intervalCandidate)
    ? clamp(
        Math.round(intervalCandidate),
        MIN_SYNC_INTERVAL_MINUTES,
        MAX_SYNC_INTERVAL_MINUTES
      )
    : defaults.autoSyncIntervalMinutes;

  const customInspectors = normalizeCustomInspectors(candidate.customInspectors);
  const referenceInspectors = [...INSPECTORS, ...customInspectors];

  return {
    holidays: normalizeHolidayDates(candidate.holidays),
    customInspectors,
    inspectorOverrides: normalizeInspectorOverrides(
      candidate.inspectorOverrides,
      referenceInspectors
    ),
    inspectorAbsences: normalizeInspectorAbsences(
      candidate.inspectorAbsences,
      referenceInspectors
    ),
    dispatchCapacity: normalizeDispatchCapacity(
      candidate.dispatchCapacity,
      referenceInspectors
    ),
    autoSyncEnabled,
    autoSyncIntervalMinutes,
  };
}

export function loadDispatchSettings(): DispatchSettings {
  if (typeof window === "undefined") {
    return createDefaultDispatchSettings();
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return createDefaultDispatchSettings();
    }
    const parsed = JSON.parse(raw);
    return sanitizeDispatchSettings(parsed);
  } catch {
    return createDefaultDispatchSettings();
  }
}

export function saveDispatchSettings(settings: DispatchSettings): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify(sanitizeDispatchSettings(settings))
  );
}

export function applyInspectorOverrides(
  inspectors: Inspector[],
  settings: DispatchSettings
): Inspector[] {
  return inspectors.map((inspector) => {
    const override = settings.inspectorOverrides[inspector.id];
    const initials = override?.initials?.trim() || inspector.initials;
    const name = override?.name?.trim() || inspector.name || `Toezichter ${initials}`;
    const primaryPostcodes =
      Array.isArray(override?.primaryPostcodes)
        ? override.primaryPostcodes
        : inspector.primaryPostcodes;
    const backupPostcodes =
      Array.isArray(override?.backupPostcodes)
        ? override.backupPostcodes
        : inspector.backupPostcodes;
    const isReserve =
      typeof override?.isReserve === "boolean"
        ? override.isReserve
        : inspector.isReserve ?? false;
    const activeWindow = normalizeActiveWindow(
      override?.activeFrom ?? inspector.activeFrom,
      override?.activeUntil ?? inspector.activeUntil
    );

    return {
      ...inspector,
      initials,
      name,
      primaryPostcodes,
      backupPostcodes,
      isReserve,
      activeFrom: activeWindow.activeFrom,
      activeUntil: activeWindow.activeUntil,
    };
  });
}

export function getConfiguredInspectors(settings: DispatchSettings): Inspector[] {
  const seen = new Set<string>();
  const merged: Inspector[] = [];

  for (const inspector of INSPECTORS) {
    merged.push(inspector);
    seen.add(inspector.id);
  }

  for (const inspector of settings.customInspectors) {
    if (seen.has(inspector.id)) {
      continue;
    }
    merged.push(inspector);
    seen.add(inspector.id);
  }

  return applyInspectorOverrides(merged, settings);
}

export function parseHolidayText(text: string): {
  valid: string[];
  invalid: string[];
} {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const valid: string[] = [];
  const invalid: string[] = [];

  for (const line of lines) {
    if (isIsoDate(line)) {
      valid.push(line);
    } else {
      invalid.push(line);
    }
  }

  return {
    valid: [...new Set(valid)].sort((a, b) => a.localeCompare(b)),
    invalid,
  };
}

export function isInspectorDeployableOnDate(
  inspector: Inspector,
  date: string
): boolean {
  if (!isIsoDate(date)) {
    return true;
  }

  if (inspector.activeFrom && date < inspector.activeFrom) {
    return false;
  }

  if (inspector.activeUntil && date > inspector.activeUntil) {
    return false;
  }

  return true;
}

export function isInspectorAbsentOnDate(
  settings: DispatchSettings,
  inspectorId: string,
  date: string
): boolean {
  if (!isIsoDate(date)) {
    return false;
  }

  const ranges = settings.inspectorAbsences[inspectorId] ?? [];
  return ranges.some((range) => date >= range.startDate && date <= range.endDate);
}

export function getAbsentInspectorIds(
  settings: DispatchSettings,
  date: string,
  inspectorIds?: string[]
): string[] {
  if (!isIsoDate(date)) {
    return [];
  }

  const candidateIds =
    inspectorIds && inspectorIds.length > 0
      ? inspectorIds
      : getConfiguredInspectors(settings).map((inspector) => inspector.id);

  return candidateIds.filter((inspectorId) =>
    isInspectorAbsentOnDate(settings, inspectorId, date)
  );
}

export function getInactiveInspectorIds(
  settings: DispatchSettings,
  date: string,
  inspectorIds?: string[]
): string[] {
  const configuredInspectors = getConfiguredInspectors(settings);
  const inspectorById = new Map(configuredInspectors.map((inspector) => [inspector.id, inspector]));
  const candidateIds =
    inspectorIds && inspectorIds.length > 0
      ? inspectorIds
      : configuredInspectors.map((inspector) => inspector.id);

  return candidateIds.filter((inspectorId) => {
    const inspector = inspectorById.get(inspectorId);
    if (!inspector) {
      return false;
    }
    return !isInspectorDeployableOnDate(inspector, date);
  });
}
