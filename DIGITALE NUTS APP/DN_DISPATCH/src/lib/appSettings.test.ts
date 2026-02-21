import { describe, expect, it } from "vitest";
import {
  createDefaultDispatchSettings,
  getAbsentInspectorIds,
  getConfiguredInspectors,
  getInactiveInspectorIds,
  isInspectorAbsentOnDate,
  isInspectorDeployableOnDate,
  sanitizeDispatchSettings,
} from "./appSettings";

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
