import { afterEach, describe, expect, it, vi } from "vitest";
import {
  INSPECTOR_SETTINGS_EXPORT_FORMAT,
  INSPECTOR_SETTINGS_EXPORT_VERSION,
  SETTINGS_BACKUP_STORAGE_KEY,
  SETTINGS_PREVIOUS_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
  createDefaultDispatchSettings,
  exportInspectorSettings,
  getAbsentInspectorIds,
  getConfiguredInspectors,
  getInactiveInspectorIds,
  importInspectorSettings,
  isInspectorAbsentOnDate,
  isInspectorDeployableOnDate,
  loadDispatchSettings,
  saveDispatchSettings,
  sanitizeDispatchSettings,
} from "./appSettings";

function createLocalStorageMock(seed: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(seed));

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("appSettings - afwezigheidsplanning", () => {
  it("heeft standaard geen afwezige toezichters", () => {
    const defaults = createDefaultDispatchSettings();
    expect(defaults.customInspectors).toEqual([]);
    expect(defaults.inspectorAbsences).toEqual({});
    expect(defaults.dispatchCapacity.softDailyLimit).toBe(5);
    expect(defaults.dispatchCapacity.hardDailyLimit).toBe(6);
    expect(getAbsentInspectorIds(defaults, "2026-02-20")).toEqual([]);
  });

  it("normaliseert en merge't overlap in afwezigheidsranges", () => {
    const settings = sanitizeDispatchSettings({
      inspectorAbsences: {
        I1: [
          { startDate: "2026-07-10", endDate: "2026-07-12" },
          { startDate: "2026-07-11", endDate: "2026-07-13" },
          { startDate: "2026-07-20", endDate: "2026-07-20" },
          { startDate: "fout", endDate: "2026-07-22" },
        ],
      },
    });

    expect(settings.inspectorAbsences.I1).toEqual([
      { startDate: "2026-07-10", endDate: "2026-07-13" },
      { startDate: "2026-07-20", endDate: "2026-07-20" },
    ]);
  });

  it("detecteert afwezigheid op datum correct", () => {
    const settings = sanitizeDispatchSettings({
      inspectorAbsences: {
        I2: [{ startDate: "2026-08-01", endDate: "2026-08-03" }],
      },
    });

    expect(isInspectorAbsentOnDate(settings, "I2", "2026-08-02")).toBe(true);
    expect(isInspectorAbsentOnDate(settings, "I2", "2026-08-05")).toBe(false);
    expect(getAbsentInspectorIds(settings, "2026-08-02")).toEqual(["I2"]);
  });

  it("laat custom toezichters toe en sanitiseert inzettermijn", () => {
    const settings = sanitizeDispatchSettings({
      customInspectors: [
        {
          id: "i8",
          initials: "OP",
          name: "Reserve OP",
          color: "#123ABC",
          primaryPostcodes: ["2660"],
          backupPostcodes: ["2610"],
          isReserve: true,
          activeFrom: "2026-09-15",
          activeUntil: "2026-08-15",
        },
      ],
    });

    const configured = getConfiguredInspectors(settings);
    const i8 = configured.find((inspector) => inspector.id === "I8");

    expect(i8).toBeDefined();
    expect(i8?.isReserve).toBe(true);
    expect(i8?.activeFrom).toBe("2026-08-15");
    expect(i8?.activeUntil).toBe("2026-09-15");
  });

  it("detecteert niet-inzetbare toezichters buiten actieve termijn", () => {
    const settings = sanitizeDispatchSettings({
      customInspectors: [
        {
          id: "I9",
          initials: "QR",
          name: "Reserve QR",
          color: "#457B9D",
          primaryPostcodes: ["2000"],
          backupPostcodes: ["2018"],
          isReserve: true,
          activeUntil: "2026-09-30",
        },
      ],
    });

    const configured = getConfiguredInspectors(settings);
    const i9 = configured.find((inspector) => inspector.id === "I9");
    expect(i9).toBeDefined();

    expect(isInspectorDeployableOnDate(i9!, "2026-09-15")).toBe(true);
    expect(isInspectorDeployableOnDate(i9!, "2026-10-01")).toBe(false);
    expect(getInactiveInspectorIds(settings, "2026-10-01")).toContain("I9");
  });

  it("normaliseert dispatchcapaciteit en per-toezichter overrides", () => {
    const settings = sanitizeDispatchSettings({
      dispatchCapacity: {
        softDailyLimit: 4,
        hardDailyLimit: 8,
        standardVisitWeight: 0.9,
        complexVisitWeight: 1.7,
        inspectorOverrides: {
          I1: {
            softDailyLimit: 3,
            hardDailyLimit: 6,
            fixedDailyLoad: 1.5,
            experienceFactor: 1.2,
          },
        },
      },
    });

    expect(settings.dispatchCapacity.softDailyLimit).toBe(4);
    expect(settings.dispatchCapacity.hardDailyLimit).toBe(8);
    expect(settings.dispatchCapacity.standardVisitWeight).toBe(0.9);
    expect(settings.dispatchCapacity.complexVisitWeight).toBe(1.7);
    expect(settings.dispatchCapacity.inspectorOverrides.I1).toEqual({
      softDailyLimit: 3,
      hardDailyLimit: 6,
      fixedDailyLoad: 1.5,
      experienceFactor: 1.2,
    });
  });
});

describe("appSettings - automatische restore", () => {
  it("schrijft bij save ook backup en previous snapshot", () => {
    const previousState = sanitizeDispatchSettings({
      inspectorOverrides: {
        I1: {
          initials: "OLD",
        },
      },
    });
    const previousSerialized = JSON.stringify(previousState);
    const storage = createLocalStorageMock({
      [SETTINGS_STORAGE_KEY]: previousSerialized,
    });

    vi.stubGlobal("window", { localStorage: storage });

    const nextState = sanitizeDispatchSettings({
      inspectorOverrides: {
        I1: {
          initials: "CVL",
        },
      },
      customInspectors: [
        {
          id: "I8",
          initials: "RES",
          name: "Reserve Test",
          color: "#264653",
          primaryPostcodes: ["2000"],
          backupPostcodes: ["2018"],
          isReserve: true,
        },
      ],
    });

    saveDispatchSettings(nextState);

    expect(storage.getItem(SETTINGS_PREVIOUS_STORAGE_KEY)).toBe(previousSerialized);
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBe(
      storage.getItem(SETTINGS_BACKUP_STORAGE_KEY)
    );
    const persisted = sanitizeDispatchSettings(
      JSON.parse(storage.getItem(SETTINGS_STORAGE_KEY) ?? "{}")
    );
    expect(persisted.inspectorOverrides.I1?.initials).toBe("CVL");
    expect(
      persisted.customInspectors.some((inspector) => inspector.id === "I8")
    ).toBe(true);
  });

  it("herstelt automatisch uit backup wanneer primary ontbreekt of corrupt is", () => {
    const backupState = sanitizeDispatchSettings({
      inspectorOverrides: {
        I1: {
          initials: "REC",
        },
      },
      customInspectors: [
        {
          id: "I9",
          initials: "TMP",
          name: "Herstel Toezichter",
          color: "#457b9d",
          primaryPostcodes: ["2600"],
          backupPostcodes: ["2000"],
          isReserve: true,
        },
      ],
    });
    const backupSerialized = JSON.stringify(backupState);
    const storage = createLocalStorageMock({
      [SETTINGS_STORAGE_KEY]: "{invalid-json",
      [SETTINGS_BACKUP_STORAGE_KEY]: backupSerialized,
    });
    vi.stubGlobal("window", { localStorage: storage });

    const restored = loadDispatchSettings();

    expect(restored.inspectorOverrides.I1?.initials).toBe("REC");
    expect(
      restored.customInspectors.some((inspector) => inspector.id === "I9")
    ).toBe(true);
    expect(storage.getItem(SETTINGS_STORAGE_KEY)).toBe(backupSerialized);
  });
});

describe("appSettings - inspector import/export", () => {
  it("exporteert inspectorsettings in versieformaat", () => {
    const settings = sanitizeDispatchSettings({
      customInspectors: [
        {
          id: "I8",
          initials: "RSV",
          name: "Reserve Noord",
          color: "#264653",
          primaryPostcodes: ["2000"],
          backupPostcodes: ["2018"],
          isReserve: true,
        },
      ],
      inspectorOverrides: {
        I1: {
          initials: "CVL",
        },
      },
    });

    const raw = exportInspectorSettings(settings);
    const parsed = JSON.parse(raw) as {
      format: string;
      version: number;
      settings: {
        customInspectors: Array<{ id: string }>;
      };
    };

    expect(parsed.format).toBe(INSPECTOR_SETTINGS_EXPORT_FORMAT);
    expect(parsed.version).toBe(INSPECTOR_SETTINGS_EXPORT_VERSION);
    expect(parsed.settings.customInspectors.some((inspector) => inspector.id === "I8")).toBe(true);
  });

  it("importeert inspectorsettings en behoudt niet-gerelateerde app-instellingen", () => {
    const base = sanitizeDispatchSettings({
      holidays: ["2026-01-01"],
      autoSyncEnabled: false,
      autoSyncIntervalMinutes: 120,
      inspectorOverrides: {
        I1: {
          initials: "OLD",
        },
      },
    });

    const importRaw = JSON.stringify({
      format: INSPECTOR_SETTINGS_EXPORT_FORMAT,
      version: INSPECTOR_SETTINGS_EXPORT_VERSION,
      exportedAt: "2026-02-22T10:00:00.000Z",
      settings: {
        customInspectors: [
          {
            id: "I9",
            initials: "TMP",
            name: "Reserve Test",
            color: "#457b9d",
            primaryPostcodes: ["2600"],
            backupPostcodes: ["2000"],
            isReserve: true,
          },
        ],
        inspectorOverrides: {
          I1: {
            initials: "CVL",
          },
        },
        inspectorAbsences: {
          I1: [{ startDate: "2026-07-10", endDate: "2026-07-12" }],
        },
        dispatchCapacity: {
          softDailyLimit: 4,
          hardDailyLimit: 6,
          standardVisitWeight: 1,
          complexVisitWeight: 1.5,
          inspectorOverrides: {
            I1: {
              fixedDailyLoad: 1,
            },
          },
        },
      },
    });

    const imported = importInspectorSettings(importRaw, base);

    expect(imported.autoSyncEnabled).toBe(false);
    expect(imported.autoSyncIntervalMinutes).toBe(120);
    expect(imported.holidays).toEqual(["2026-01-01"]);
    expect(imported.inspectorOverrides.I1?.initials).toBe("CVL");
    expect(imported.customInspectors.some((inspector) => inspector.id === "I9")).toBe(true);
    expect(imported.inspectorAbsences.I1).toEqual([
      { startDate: "2026-07-10", endDate: "2026-07-12" },
    ]);
    expect(imported.dispatchCapacity.softDailyLimit).toBe(4);
  });

  it("geeft een duidelijke fout bij onleesbare import-json", () => {
    expect(() => importInspectorSettings("{invalid", createDefaultDispatchSettings())).toThrow(
      "JSON kon niet gelezen worden."
    );
  });
});
