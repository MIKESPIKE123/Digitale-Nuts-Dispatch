import { useEffect, useMemo, useState } from "react";
import {
  MAX_DAILY_LIMIT,
  MAX_EXPERIENCE_FACTOR,
  MAX_FIXED_DAILY_LOAD,
  MAX_VISIT_WEIGHT,
  MIN_DAILY_LIMIT,
  MIN_EXPERIENCE_FACTOR,
  MIN_FIXED_DAILY_LOAD,
  MAX_SYNC_INTERVAL_MINUTES,
  MIN_VISIT_WEIGHT,
  MIN_SYNC_INTERVAL_MINUTES,
  parseHolidayText,
} from "../lib/appSettings";
import type { DispatchSettings, Inspector, InspectorAbsenceRange } from "../types";

type SettingsModalProps = {
  isOpen: boolean;
  inspectors: Inspector[];
  settings: DispatchSettings;
  onClose: () => void;
  onSave: (nextSettings: DispatchSettings) => void;
};

type InspectorDraft = {
  draftKey: string;
  source: "default" | "custom";
  originalId: string;
  currentId: string;
  currentInitials: string;
  currentName: string;
  currentPrimaryPostcodes: string;
  currentBackupPostcodes: string;
  currentIsReserve: boolean;
  currentActiveFrom: string;
  currentActiveUntil: string;
  currentAbsencePlanning: string;
  currentColor: string;
  currentCapacitySoftOverride: string;
  currentCapacityHardOverride: string;
  currentFixedDailyLoad: string;
  currentExperienceFactor: string;
};

const POSTCODE_REGEX = /^\d{4}$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const INSPECTOR_ID_REGEX = /^I\d+$/i;
const FALLBACK_CUSTOM_COLORS = [
  "#264653",
  "#2a9d8f",
  "#e9c46a",
  "#f4a261",
  "#e76f51",
  "#8ab17d",
];

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

function parsePostcodeText(value: string): { postcodes: string[]; invalid: string[] } {
  const tokens = value
    .split(/[,\s;]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const postcodes: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (!POSTCODE_REGEX.test(token)) {
      invalid.push(token);
      continue;
    }

    if (seen.has(token)) {
      continue;
    }

    seen.add(token);
    postcodes.push(token);
  }

  postcodes.sort((a, b) => a.localeCompare(b, "nl", { numeric: true }));

  return {
    postcodes,
    invalid,
  };
}

function formatAbsencePlanning(ranges: InspectorAbsenceRange[]): string {
  return ranges
    .map((range) =>
      range.startDate === range.endDate
        ? range.startDate
        : `${range.startDate}..${range.endDate}`
    )
    .join("\n");
}

function parseAbsencePlanningText(value: string): {
  ranges: InspectorAbsenceRange[];
  invalid: string[];
} {
  const tokens = value
    .split(/\r?\n|[,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const ranges: InspectorAbsenceRange[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (token.includes("..")) {
      const [startRaw, endRaw] = token.split("..", 2);
      const startDate = (startRaw ?? "").trim();
      const endDate = (endRaw ?? "").trim();

      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        invalid.push(token);
        continue;
      }

      const rangeStart = startDate <= endDate ? startDate : endDate;
      const rangeEnd = startDate <= endDate ? endDate : startDate;
      const key = `${rangeStart}|${rangeEnd}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      ranges.push({
        startDate: rangeStart,
        endDate: rangeEnd,
      });
      continue;
    }

    if (!isIsoDate(token)) {
      invalid.push(token);
      continue;
    }

    const key = `${token}|${token}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    ranges.push({
      startDate: token,
      endDate: token,
    });
  }

  ranges.sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.endDate.localeCompare(b.endDate);
  });

  return {
    ranges,
    invalid,
  };
}

function normalizeActiveWindow(
  startDate: string,
  endDate: string
): { startDate: string; endDate: string } {
  if (startDate && endDate && startDate > endDate) {
    return { startDate: endDate, endDate: startDate };
  }
  return { startDate, endDate };
}

function parseOptionalNumberInput(value: string): number | undefined {
  const cleaned = value.trim();
  if (!cleaned) {
    return undefined;
  }

  const parsed = Number(cleaned.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function createNextInspectorId(drafts: InspectorDraft[]): string {
  const highest = drafts.reduce((max, draft) => {
    const match = draft.currentId.trim().toUpperCase().match(/^I(\d+)$/);
    if (!match) {
      return max;
    }
    const value = Number(match[1]);
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 7);

  return `I${highest + 1}`;
}

export function SettingsModal({
  isOpen,
  inspectors,
  settings,
  onClose,
  onSave,
}: SettingsModalProps) {
  const [holidayText, setHolidayText] = useState("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState("60");
  const [softDailyLimit, setSoftDailyLimit] = useState("5");
  const [hardDailyLimit, setHardDailyLimit] = useState("6");
  const [standardVisitWeight, setStandardVisitWeight] = useState("1");
  const [complexVisitWeight, setComplexVisitWeight] = useState("1.5");
  const [inspectorDrafts, setInspectorDrafts] = useState<InspectorDraft[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const defaultDrafts: InspectorDraft[] = inspectors.map((inspector) => {
      const override = settings.inspectorOverrides[inspector.id];
      const capacityOverride = settings.dispatchCapacity.inspectorOverrides[inspector.id];
      const currentId = inspector.id;
      return {
        draftKey: `default:${inspector.id}`,
        source: "default",
        originalId: inspector.id,
        currentId,
        currentInitials: (override?.initials ?? inspector.initials).toUpperCase(),
        currentName: override?.name ?? inspector.name ?? `Toezichter ${inspector.initials}`,
        currentPrimaryPostcodes: (
          override?.primaryPostcodes ?? inspector.primaryPostcodes
        ).join(", "),
        currentBackupPostcodes: (
          override?.backupPostcodes ?? inspector.backupPostcodes
        ).join(", "),
        currentIsReserve:
          typeof override?.isReserve === "boolean"
            ? override.isReserve
            : inspector.isReserve ?? false,
        currentActiveFrom: override?.activeFrom ?? inspector.activeFrom ?? "",
        currentActiveUntil: override?.activeUntil ?? inspector.activeUntil ?? "",
        currentAbsencePlanning: formatAbsencePlanning(
          settings.inspectorAbsences[inspector.id] ?? []
        ),
        currentColor: inspector.color,
        currentCapacitySoftOverride:
          capacityOverride?.softDailyLimit === undefined
            ? ""
            : `${capacityOverride.softDailyLimit}`,
        currentCapacityHardOverride:
          capacityOverride?.hardDailyLimit === undefined
            ? ""
            : `${capacityOverride.hardDailyLimit}`,
        currentFixedDailyLoad:
          capacityOverride?.fixedDailyLoad === undefined
            ? ""
            : `${capacityOverride.fixedDailyLoad}`,
        currentExperienceFactor:
          capacityOverride?.experienceFactor === undefined
            ? ""
            : `${capacityOverride.experienceFactor}`,
      };
    });

    const customDrafts: InspectorDraft[] = settings.customInspectors.map((inspector) => {
      const capacityOverride = settings.dispatchCapacity.inspectorOverrides[inspector.id];
      return {
        draftKey: `custom:${inspector.id}`,
        source: "custom",
        originalId: inspector.id,
        currentId: inspector.id,
        currentInitials: inspector.initials.toUpperCase(),
        currentName: inspector.name ?? `Toezichter ${inspector.initials}`,
        currentPrimaryPostcodes: inspector.primaryPostcodes.join(", "),
        currentBackupPostcodes: inspector.backupPostcodes.join(", "),
        currentIsReserve: inspector.isReserve ?? true,
        currentActiveFrom: inspector.activeFrom ?? "",
        currentActiveUntil: inspector.activeUntil ?? "",
        currentAbsencePlanning: formatAbsencePlanning(
          settings.inspectorAbsences[inspector.id] ?? []
        ),
        currentColor: inspector.color,
        currentCapacitySoftOverride:
          capacityOverride?.softDailyLimit === undefined
            ? ""
            : `${capacityOverride.softDailyLimit}`,
        currentCapacityHardOverride:
          capacityOverride?.hardDailyLimit === undefined
            ? ""
            : `${capacityOverride.hardDailyLimit}`,
        currentFixedDailyLoad:
          capacityOverride?.fixedDailyLoad === undefined
            ? ""
            : `${capacityOverride.fixedDailyLoad}`,
        currentExperienceFactor:
          capacityOverride?.experienceFactor === undefined
            ? ""
            : `${capacityOverride.experienceFactor}`,
      };
    });

    setHolidayText(settings.holidays.join("\n"));
    setAutoSyncEnabled(settings.autoSyncEnabled);
    setAutoSyncIntervalMinutes(`${settings.autoSyncIntervalMinutes}`);
    setSoftDailyLimit(`${settings.dispatchCapacity.softDailyLimit}`);
    setHardDailyLimit(`${settings.dispatchCapacity.hardDailyLimit}`);
    setStandardVisitWeight(`${settings.dispatchCapacity.standardVisitWeight}`);
    setComplexVisitWeight(`${settings.dispatchCapacity.complexVisitWeight}`);
    setInspectorDrafts([...defaultDrafts, ...customDrafts]);
    setErrorMessage("");
  }, [inspectors, isOpen, settings]);

  const invalidHolidayPreview = useMemo(() => {
    if (!isOpen) {
      return [];
    }
    return parseHolidayText(holidayText).invalid.slice(0, 3);
  }, [holidayText, isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleInspectorChange = (
    draftKey: string,
    field:
      | "currentId"
      | "currentInitials"
      | "currentName"
      | "currentPrimaryPostcodes"
      | "currentBackupPostcodes"
      | "currentActiveFrom"
      | "currentActiveUntil"
      | "currentAbsencePlanning"
      | "currentCapacitySoftOverride"
      | "currentCapacityHardOverride"
      | "currentFixedDailyLoad"
      | "currentExperienceFactor",
    value: string
  ) => {
    setInspectorDrafts((previous) =>
      previous.map((draft) =>
        draft.draftKey === draftKey ? { ...draft, [field]: value } : draft
      )
    );
  };

  const handleReserveToggle = (draftKey: string, nextValue: boolean) => {
    setInspectorDrafts((previous) =>
      previous.map((draft) =>
        draft.draftKey === draftKey ? { ...draft, currentIsReserve: nextValue } : draft
      )
    );
  };

  const handleAddCustomInspector = () => {
    setInspectorDrafts((previous) => {
      const nextId = createNextInspectorId(previous);
      return [
        ...previous,
        {
          draftKey: `custom:${nextId}:${Date.now()}`,
          source: "custom",
          originalId: nextId,
          currentId: nextId,
          currentInitials: nextId,
          currentName: `Toezichter ${nextId}`,
          currentPrimaryPostcodes: "",
          currentBackupPostcodes: "",
          currentIsReserve: true,
          currentActiveFrom: "",
          currentActiveUntil: "",
          currentAbsencePlanning: "",
          currentColor:
            FALLBACK_CUSTOM_COLORS[
              previous.filter((draft) => draft.source === "custom").length %
                FALLBACK_CUSTOM_COLORS.length
            ],
          currentCapacitySoftOverride: "",
          currentCapacityHardOverride: "",
          currentFixedDailyLoad: "",
          currentExperienceFactor: "",
        },
      ];
    });
  };

  const handleRemoveCustomInspector = (draftKey: string) => {
    setInspectorDrafts((previous) =>
      previous.filter((draft) => draft.draftKey !== draftKey)
    );
  };

  const handleSave = () => {
    const holidaysResult = parseHolidayText(holidayText);

    if (holidaysResult.valid.length === 0) {
      setErrorMessage("Minstens 1 geldige vakantiedag vereist (YYYY-MM-DD).");
      return;
    }

    if (holidaysResult.invalid.length > 0) {
      setErrorMessage(
        `Ongeldige vakantiedatums: ${holidaysResult.invalid.slice(0, 4).join(", ")}`
      );
      return;
    }

    const intervalRaw = Number(autoSyncIntervalMinutes);
    if (!Number.isFinite(intervalRaw)) {
      setErrorMessage("Sync-interval moet een getal zijn.");
      return;
    }

    const boundedInterval = Math.min(
      MAX_SYNC_INTERVAL_MINUTES,
      Math.max(MIN_SYNC_INTERVAL_MINUTES, Math.round(intervalRaw))
    );

    const softLimitParsed = parseOptionalNumberInput(softDailyLimit);
    const hardLimitParsed = parseOptionalNumberInput(hardDailyLimit);
    const standardWeightParsed = parseOptionalNumberInput(standardVisitWeight);
    const complexWeightParsed = parseOptionalNumberInput(complexVisitWeight);

    if (
      softLimitParsed === undefined ||
      hardLimitParsed === undefined ||
      standardWeightParsed === undefined ||
      complexWeightParsed === undefined
    ) {
      setErrorMessage("Dispatchcapaciteit vereist geldige numerieke waarden.");
      return;
    }

    const globalSoftDailyLimit = Math.round(softLimitParsed);
    const globalHardDailyLimit = Math.round(hardLimitParsed);

    if (
      globalSoftDailyLimit < MIN_DAILY_LIMIT ||
      globalSoftDailyLimit > MAX_DAILY_LIMIT ||
      globalHardDailyLimit < MIN_DAILY_LIMIT ||
      globalHardDailyLimit > MAX_DAILY_LIMIT
    ) {
      setErrorMessage(
        `Globale soft/hard limiet moet tussen ${MIN_DAILY_LIMIT} en ${MAX_DAILY_LIMIT} liggen.`
      );
      return;
    }

    if (globalHardDailyLimit < globalSoftDailyLimit) {
      setErrorMessage("Globale hard limiet moet >= globale soft limiet zijn.");
      return;
    }

    if (
      standardWeightParsed < MIN_VISIT_WEIGHT ||
      standardWeightParsed > MAX_VISIT_WEIGHT ||
      complexWeightParsed < MIN_VISIT_WEIGHT ||
      complexWeightParsed > MAX_VISIT_WEIGHT
    ) {
      setErrorMessage(
        `Visit weights moeten tussen ${MIN_VISIT_WEIGHT} en ${MAX_VISIT_WEIGHT} liggen.`
      );
      return;
    }

    if (complexWeightParsed < standardWeightParsed) {
      setErrorMessage("Complex visit weight moet >= standaard visit weight zijn.");
      return;
    }

    const overrides: DispatchSettings["inspectorOverrides"] = {};
    const customInspectors: DispatchSettings["customInspectors"] = [];
    const inspectorAbsences: DispatchSettings["inspectorAbsences"] = {};
    const capacityOverrides: DispatchSettings["dispatchCapacity"]["inspectorOverrides"] = {};

    const defaultsById = new Map(inspectors.map((inspector) => [inspector.id, inspector]));
    const seenInspectorIds = new Set<string>();

    for (const draft of inspectorDrafts) {
      const inspectorId = draft.currentId.trim().toUpperCase();
      const initials = draft.currentInitials.trim().toUpperCase();
      const name = draft.currentName.trim();
      const parsedPrimary = parsePostcodeText(draft.currentPrimaryPostcodes);
      const parsedBackup = parsePostcodeText(draft.currentBackupPostcodes);
      const parsedAbsence = parseAbsencePlanningText(draft.currentAbsencePlanning);
      const softOverride = parseOptionalNumberInput(draft.currentCapacitySoftOverride);
      const hardOverride = parseOptionalNumberInput(draft.currentCapacityHardOverride);
      const fixedDailyLoad = parseOptionalNumberInput(draft.currentFixedDailyLoad);
      const experienceFactor = parseOptionalNumberInput(draft.currentExperienceFactor);

      if (!inspectorId || !INSPECTOR_ID_REGEX.test(inspectorId)) {
        setErrorMessage(`Ongeldige toezichter-ID: ${draft.currentId || "(leeg)"}. Gebruik I8, I9, ...`);
        return;
      }

      if (seenInspectorIds.has(inspectorId)) {
        setErrorMessage(`Dubbele toezichter-ID: ${inspectorId}.`);
        return;
      }
      seenInspectorIds.add(inspectorId);

      if (!initials) {
        setErrorMessage(`Initialen ontbreken voor ${inspectorId}.`);
        return;
      }

      if (parsedPrimary.postcodes.length === 0) {
        setErrorMessage(`Minstens 1 primaire postcode vereist voor ${inspectorId}.`);
        return;
      }

      if (parsedPrimary.invalid.length > 0 || parsedBackup.invalid.length > 0) {
        const invalidExamples = [...parsedPrimary.invalid, ...parsedBackup.invalid]
          .slice(0, 3)
          .join(", ");
        setErrorMessage(`Ongeldige postcode(s) bij ${inspectorId}: ${invalidExamples}`);
        return;
      }

      if (parsedAbsence.invalid.length > 0) {
        setErrorMessage(
          `Ongeldige afwezigheidsplanning bij ${inspectorId}: ${parsedAbsence.invalid
            .slice(0, 3)
            .join(", ")}`
        );
        return;
      }

      if (parsedAbsence.ranges.length > 0) {
        inspectorAbsences[inspectorId] = parsedAbsence.ranges;
      }

      const activeFrom = draft.currentActiveFrom.trim();
      const activeUntil = draft.currentActiveUntil.trim();
      if ((activeFrom && !isIsoDate(activeFrom)) || (activeUntil && !isIsoDate(activeUntil))) {
        setErrorMessage(
          `Ongeldige inzettermijn bij ${inspectorId}. Gebruik YYYY-MM-DD.`
        );
        return;
      }

      if (
        softOverride !== undefined &&
        (softOverride < MIN_DAILY_LIMIT || softOverride > MAX_DAILY_LIMIT)
      ) {
        setErrorMessage(
          `Soft override bij ${inspectorId} moet tussen ${MIN_DAILY_LIMIT} en ${MAX_DAILY_LIMIT} liggen.`
        );
        return;
      }

      if (
        hardOverride !== undefined &&
        (hardOverride < MIN_DAILY_LIMIT || hardOverride > MAX_DAILY_LIMIT)
      ) {
        setErrorMessage(
          `Hard override bij ${inspectorId} moet tussen ${MIN_DAILY_LIMIT} en ${MAX_DAILY_LIMIT} liggen.`
        );
        return;
      }

      if (
        softOverride !== undefined &&
        hardOverride !== undefined &&
        hardOverride < softOverride
      ) {
        setErrorMessage(`Hard override moet >= soft override zijn bij ${inspectorId}.`);
        return;
      }

      if (
        fixedDailyLoad !== undefined &&
        (fixedDailyLoad < MIN_FIXED_DAILY_LOAD || fixedDailyLoad > MAX_FIXED_DAILY_LOAD)
      ) {
        setErrorMessage(
          `Vaste dagbelasting bij ${inspectorId} moet tussen ${MIN_FIXED_DAILY_LOAD} en ${MAX_FIXED_DAILY_LOAD} liggen.`
        );
        return;
      }

      if (
        experienceFactor !== undefined &&
        (experienceFactor < MIN_EXPERIENCE_FACTOR || experienceFactor > MAX_EXPERIENCE_FACTOR)
      ) {
        setErrorMessage(
          `Ervaringsfactor bij ${inspectorId} moet tussen ${MIN_EXPERIENCE_FACTOR} en ${MAX_EXPERIENCE_FACTOR} liggen.`
        );
        return;
      }

      const normalizedWindow = normalizeActiveWindow(activeFrom, activeUntil);
      const roundedSoftOverride =
        softOverride === undefined ? undefined : Math.round(softOverride);
      const roundedHardOverride =
        hardOverride === undefined ? undefined : Math.round(hardOverride);
      const roundedFixedDailyLoad =
        fixedDailyLoad === undefined ? undefined : Math.round(fixedDailyLoad * 100) / 100;
      const roundedExperienceFactor =
        experienceFactor === undefined ? undefined : Math.round(experienceFactor * 100) / 100;

      if (
        roundedSoftOverride !== undefined ||
        roundedHardOverride !== undefined ||
        roundedFixedDailyLoad !== undefined ||
        roundedExperienceFactor !== undefined
      ) {
        capacityOverrides[inspectorId] = {
          softDailyLimit: roundedSoftOverride,
          hardDailyLimit: roundedHardOverride,
          fixedDailyLoad: roundedFixedDailyLoad,
          experienceFactor: roundedExperienceFactor,
        };
      }

      if (draft.source === "default") {
        const base = defaultsById.get(draft.originalId);
        if (!base) {
          continue;
        }

        const baseName = base.name ?? `Toezichter ${base.initials}`;
        const hasDifference =
          inspectorId !== base.id ||
          initials !== base.initials ||
          name !== baseName ||
          parsedPrimary.postcodes.join(",") !== base.primaryPostcodes.join(",") ||
          parsedBackup.postcodes.join(",") !== base.backupPostcodes.join(",") ||
          draft.currentIsReserve !== (base.isReserve ?? false) ||
          (normalizedWindow.startDate || "") !== (base.activeFrom ?? "") ||
          (normalizedWindow.endDate || "") !== (base.activeUntil ?? "");

        if (hasDifference) {
          overrides[base.id] = {
            initials,
            name,
            primaryPostcodes: parsedPrimary.postcodes,
            backupPostcodes: parsedBackup.postcodes,
            isReserve: draft.currentIsReserve,
            activeFrom: normalizedWindow.startDate || undefined,
            activeUntil: normalizedWindow.endDate || undefined,
          };
        }

        continue;
      }

      if (defaultsById.has(inspectorId)) {
        setErrorMessage(
          `ID ${inspectorId} bestaat al als standaardtoezichter. Kies een nieuw ID (bv. I8, I9, ...).`
        );
        return;
      }

      customInspectors.push({
        id: inspectorId,
        initials,
        name: name || `Toezichter ${initials}`,
        color: draft.currentColor,
        primaryPostcodes: parsedPrimary.postcodes,
        backupPostcodes: parsedBackup.postcodes,
        isReserve: draft.currentIsReserve,
        activeFrom: normalizedWindow.startDate || undefined,
        activeUntil: normalizedWindow.endDate || undefined,
      });
    }

    onSave({
      holidays: holidaysResult.valid,
      customInspectors,
      inspectorOverrides: overrides,
      inspectorAbsences,
      dispatchCapacity: {
        softDailyLimit: globalSoftDailyLimit,
        hardDailyLimit: globalHardDailyLimit,
        standardVisitWeight: Math.round(standardWeightParsed * 100) / 100,
        complexVisitWeight: Math.round(complexWeightParsed * 100) / 100,
        inspectorOverrides: capacityOverrides,
      },
      autoSyncEnabled,
      autoSyncIntervalMinutes: boundedInterval,
    });
  };

  return (
    <div className="settings-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="settings-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Instellingen"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="settings-modal-head">
          <h3>Instellingen</h3>
          <button type="button" className="link-btn" onClick={onClose}>
            Sluiten
          </button>
        </div>

        <section className="settings-section">
          <p className="settings-section-title">Vakantiedagen</p>
          <p className="muted-note">1 datum per lijn (YYYY-MM-DD)</p>
          <textarea
            className="settings-textarea"
            value={holidayText}
            onChange={(event) => setHolidayText(event.target.value)}
            rows={8}
          />
          {invalidHolidayPreview.length > 0 ? (
            <p className="warning-inline">
              Ongeldig voorbeeld: {invalidHolidayPreview.join(", ")}
            </p>
          ) : null}
        </section>

        <section className="settings-section">
          <p className="settings-section-title">Toezichters</p>
          <p className="muted-note">
            Postcodes scheiden met komma of spatie (bv. 2000, 2018). IDs in formaat I8, I9, ...
          </p>
          <div className="quick-actions">
            <button type="button" className="secondary-btn" onClick={handleAddCustomInspector}>
              Voeg reservetoezichter toe
            </button>
          </div>
          <div className="settings-inspector-header" role="presentation">
            <span className="settings-inspector-head-id">ID</span>
            <span>Naam</span>
            <span>Afkorting</span>
            <span>Toegewezen wijken</span>
            <span>Backup wijken</span>
            <span>Reserve</span>
            <span>Actief van</span>
            <span>Actief tot</span>
            <span>Afwezigheidsplanning</span>
            <span>Acties</span>
          </div>
          <div className="settings-inspector-list">
            {inspectorDrafts.map((draft) => (
              <div key={draft.draftKey} className="settings-inspector-row">
                {draft.source === "custom" ? (
                  <input
                    type="text"
                    value={draft.currentId}
                    aria-label={`ID ${draft.originalId}`}
                    onChange={(event) =>
                      handleInspectorChange(draft.draftKey, "currentId", event.target.value.toUpperCase())
                    }
                    placeholder="I8"
                  />
                ) : (
                  <span className="settings-inspector-id">{draft.currentId}</span>
                )}
                <input
                  type="text"
                  value={draft.currentName}
                  aria-label={`Naam ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(draft.draftKey, "currentName", event.target.value)
                  }
                  placeholder="Naam"
                />
                <input
                  type="text"
                  value={draft.currentInitials}
                  aria-label={`Afkorting ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(
                      draft.draftKey,
                      "currentInitials",
                      event.target.value.toUpperCase()
                    )
                  }
                  placeholder="Initialen"
                  maxLength={6}
                />
                <input
                  type="text"
                  value={draft.currentPrimaryPostcodes}
                  aria-label={`Toegewezen wijken ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(draft.draftKey, "currentPrimaryPostcodes", event.target.value)
                  }
                  placeholder="Toegewezen wijken"
                />
                <input
                  type="text"
                  value={draft.currentBackupPostcodes}
                  aria-label={`Backup wijken ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(draft.draftKey, "currentBackupPostcodes", event.target.value)
                  }
                  placeholder="Backup wijken"
                />
                <label className="settings-inline-toggle">
                  <input
                    type="checkbox"
                    checked={draft.currentIsReserve}
                    onChange={(event) => handleReserveToggle(draft.draftKey, event.target.checked)}
                  />
                  Reserve
                </label>
                <input
                  type="date"
                  value={draft.currentActiveFrom}
                  aria-label={`Actief van ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(draft.draftKey, "currentActiveFrom", event.target.value)
                  }
                />
                <input
                  type="date"
                  value={draft.currentActiveUntil}
                  aria-label={`Actief tot ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(draft.draftKey, "currentActiveUntil", event.target.value)
                  }
                />
                <textarea
                  className="settings-textarea"
                  value={draft.currentAbsencePlanning}
                  aria-label={`Afwezigheidsplanning ${draft.currentId}`}
                  onChange={(event) =>
                    handleInspectorChange(
                      draft.draftKey,
                      "currentAbsencePlanning",
                      event.target.value
                    )
                  }
                  rows={2}
                  placeholder={`2026-07-10\n2026-07-22..2026-07-26`}
                />
                <div className="settings-inspector-actions">
                  {draft.source === "custom" ? (
                    <button
                      type="button"
                      className="ghost-btn"
                      onClick={() => handleRemoveCustomInspector(draft.draftKey)}
                    >
                      Verwijder
                    </button>
                  ) : (
                    <span className="muted-note">Standaard</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="muted-note">
            Afwezigheid: 1 datum per lijn (`YYYY-MM-DD`) of periode (`YYYY-MM-DD..YYYY-MM-DD`).
            Inzettermijn: leeg = altijd inzetbaar.
          </p>
        </section>

        <section className="settings-section">
          <p className="settings-section-title">Dispatchcapaciteit (variabel)</p>
          <p className="muted-note">
            Global: soft/hard daglimiet + gewogen load. Per toezichter: optionele overrides.
          </p>
          <div className="settings-capacity-grid">
            <label htmlFor="capacity-soft-limit">
              Global soft limiet
              <input
                id="capacity-soft-limit"
                type="number"
                min={MIN_DAILY_LIMIT}
                max={MAX_DAILY_LIMIT}
                value={softDailyLimit}
                onChange={(event) => setSoftDailyLimit(event.target.value)}
              />
            </label>
            <label htmlFor="capacity-hard-limit">
              Global hard limiet
              <input
                id="capacity-hard-limit"
                type="number"
                min={MIN_DAILY_LIMIT}
                max={MAX_DAILY_LIMIT}
                value={hardDailyLimit}
                onChange={(event) => setHardDailyLimit(event.target.value)}
              />
            </label>
            <label htmlFor="capacity-standard-weight">
              Weight standaard bezoek
              <input
                id="capacity-standard-weight"
                type="number"
                min={MIN_VISIT_WEIGHT}
                max={MAX_VISIT_WEIGHT}
                step="0.05"
                value={standardVisitWeight}
                onChange={(event) => setStandardVisitWeight(event.target.value)}
              />
            </label>
            <label htmlFor="capacity-complex-weight">
              Weight complex bezoek
              <input
                id="capacity-complex-weight"
                type="number"
                min={MIN_VISIT_WEIGHT}
                max={MAX_VISIT_WEIGHT}
                step="0.05"
                value={complexVisitWeight}
                onChange={(event) => setComplexVisitWeight(event.target.value)}
              />
            </label>
          </div>

          <div className="settings-capacity-per-inspector">
            <div className="settings-capacity-head">
              <span>ID</span>
              <span>Soft ov.</span>
              <span>Hard ov.</span>
              <span>Vaste load</span>
              <span>Ervaringsfactor</span>
            </div>
            {inspectorDrafts.map((draft) => (
              <div key={`cap-${draft.draftKey}`} className="settings-capacity-row">
                <span className="settings-inspector-id">{draft.currentId}</span>
                <input
                  type="number"
                  min={MIN_DAILY_LIMIT}
                  max={MAX_DAILY_LIMIT}
                  value={draft.currentCapacitySoftOverride}
                  onChange={(event) =>
                    handleInspectorChange(
                      draft.draftKey,
                      "currentCapacitySoftOverride",
                      event.target.value
                    )
                  }
                  placeholder="-"
                />
                <input
                  type="number"
                  min={MIN_DAILY_LIMIT}
                  max={MAX_DAILY_LIMIT}
                  value={draft.currentCapacityHardOverride}
                  onChange={(event) =>
                    handleInspectorChange(
                      draft.draftKey,
                      "currentCapacityHardOverride",
                      event.target.value
                    )
                  }
                  placeholder="-"
                />
                <input
                  type="number"
                  min={MIN_FIXED_DAILY_LOAD}
                  max={MAX_FIXED_DAILY_LOAD}
                  step="0.25"
                  value={draft.currentFixedDailyLoad}
                  onChange={(event) =>
                    handleInspectorChange(
                      draft.draftKey,
                      "currentFixedDailyLoad",
                      event.target.value
                    )
                  }
                  placeholder="0"
                />
                <input
                  type="number"
                  min={MIN_EXPERIENCE_FACTOR}
                  max={MAX_EXPERIENCE_FACTOR}
                  step="0.05"
                  value={draft.currentExperienceFactor}
                  onChange={(event) =>
                    handleInspectorChange(
                      draft.draftKey,
                      "currentExperienceFactor",
                      event.target.value
                    )
                  }
                  placeholder="1.0"
                />
              </div>
            ))}
          </div>
          <p className="muted-note">
            Complexe load geldt automatisch voor `Categorie 1`, `Categorie 2` en `Dringend`.
            Vaste load = andere taken (vergadering, overleg, administratie) in dagpunten.
          </p>
        </section>

        <section className="settings-section">
          <p className="settings-section-title">Automatische synchronisatie</p>
          <label className="toggle-inline">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(event) => setAutoSyncEnabled(event.target.checked)}
            />
            Automatische sync actief
          </label>
          <label htmlFor="sync-interval">Interval (minuten)</label>
          <input
            id="sync-interval"
            type="number"
            min={MIN_SYNC_INTERVAL_MINUTES}
            max={MAX_SYNC_INTERVAL_MINUTES}
            value={autoSyncIntervalMinutes}
            onChange={(event) => setAutoSyncIntervalMinutes(event.target.value)}
          />
          <p className="muted-note">
            Toegestaan: {MIN_SYNC_INTERVAL_MINUTES} tot {MAX_SYNC_INTERVAL_MINUTES} minuten.
          </p>
        </section>

        {errorMessage ? <p className="warning-inline">{errorMessage}</p> : null}

        <div className="settings-actions">
          <button type="button" className="ghost-btn" onClick={onClose}>
            Annuleer
          </button>
          <button type="button" className="secondary-btn" onClick={handleSave}>
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
