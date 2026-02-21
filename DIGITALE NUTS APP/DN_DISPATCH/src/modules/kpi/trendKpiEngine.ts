import { addDays, formatIsoDate, parseIsoDate } from "../../lib/dateUtils";
import { getIsoWeekBounds, getRecordDateKey, resolveRecordChecklistScore } from "./recordMetrics";
import type { TrendKpiCard, TrendKpiEngineInput, TrendTone } from "./types";

function formatSignedNumber(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function resolveDeltaTone(
  delta: number | null,
  positiveIsGood: boolean | "neutral"
): TrendTone {
  if (delta === null || delta === 0 || positiveIsGood === "neutral") {
    return "neutral";
  }

  if (positiveIsGood) {
    return delta > 0 ? "good" : "bad";
  }

  return delta < 0 ? "good" : "bad";
}

export function buildWeekOverWeekTrendKpis(input: TrendKpiEngineInput): TrendKpiCard[] {
  const inspectorScopeIds =
    input.terrainMode && input.activeInspectorSession
      ? new Set([input.activeInspectorSession.inspectorId])
      : input.visibleInspectorIds;

  const scopedRecords = input.records.filter((record) =>
    inspectorScopeIds.size === 0 ? true : inspectorScopeIds.has(record.inspectorSession.inspectorId)
  );

  const currentWeek = getIsoWeekBounds(input.selectedDate);
  const previousWeekReference = formatIsoDate(addDays(parseIsoDate(input.selectedDate), -7));
  const previousWeek = getIsoWeekBounds(previousWeekReference);

  const recordsInRange = (startIso: string, endIso: string) =>
    scopedRecords.filter((record) => {
      const dateKey = getRecordDateKey(record);
      if (!dateKey) {
        return false;
      }
      return dateKey >= startIso && dateKey <= endIso;
    });

  const currentWeekRecords = recordsInRange(currentWeek.startIso, currentWeek.endIso);
  const previousWeekRecords = recordsInRange(previousWeek.startIso, previousWeek.endIso);

  const currentCount = currentWeekRecords.length;
  const previousCount = previousWeekRecords.length;
  const countDelta = currentCount - previousCount;

  const currentScore =
    currentWeekRecords.length > 0
      ? Math.round(
          currentWeekRecords.reduce((sum, record) => sum + resolveRecordChecklistScore(record), 0) /
            currentWeekRecords.length
        )
      : null;
  const previousScore =
    previousWeekRecords.length > 0
      ? Math.round(
          previousWeekRecords.reduce((sum, record) => sum + resolveRecordChecklistScore(record), 0) /
            previousWeekRecords.length
        )
      : null;
  const scoreDelta =
    currentScore === null || previousScore === null ? null : currentScore - previousScore;

  const currentHandoverRate =
    currentWeekRecords.length > 0
      ? Math.round(
          (currentWeekRecords.filter(
            (record) => (record.mutablePayload.handoverDecision ?? "").trim().length > 0
          ).length /
            currentWeekRecords.length) *
            100
        )
      : null;
  const previousHandoverRate =
    previousWeekRecords.length > 0
      ? Math.round(
          (previousWeekRecords.filter(
            (record) => (record.mutablePayload.handoverDecision ?? "").trim().length > 0
          ).length /
            previousWeekRecords.length) *
            100
        )
      : null;
  const handoverDelta =
    currentHandoverRate === null || previousHandoverRate === null
      ? null
      : currentHandoverRate - previousHandoverRate;

  const currentLowScoreCount = currentWeekRecords.filter(
    (record) => resolveRecordChecklistScore(record) < 70
  ).length;
  const previousLowScoreCount = previousWeekRecords.filter(
    (record) => resolveRecordChecklistScore(record) < 70
  ).length;
  const lowScoreDelta = currentLowScoreCount - previousLowScoreCount;

  return [
    {
      key: "wow-count",
      label: "Vaststellingen (huidige week)",
      currentValue: `${currentCount}`,
      previousValue: `${previousCount}`,
      deltaValue: formatSignedNumber(countDelta),
      detail: `${currentWeek.startIso} t.e.m. ${currentWeek.endIso} vs ${previousWeek.startIso} t.e.m. ${previousWeek.endIso}`,
      definition:
        "Aantal vaststellingsrecords in huidige week vergeleken met vorige week.",
      tone: resolveDeltaTone(countDelta, "neutral"),
    },
    {
      key: "wow-score",
      label: "Gemiddelde checklistscore",
      currentValue: currentScore === null ? "n.v.t." : `${currentScore}/100`,
      previousValue: previousScore === null ? "n.v.t." : `${previousScore}/100`,
      deltaValue: scoreDelta === null ? "n.v.t." : formatSignedNumber(scoreDelta),
      detail: "Hoger is beter. Score op basis van NOK, ontbrekende checks en verantwoordelijke.",
      definition:
        "Gemiddelde van de gewogen checklistscore (0-100) per record, week op week.",
      tone: resolveDeltaTone(scoreDelta, true),
    },
    {
      key: "wow-handover",
      label: "Handover ingevuld",
      currentValue: currentHandoverRate === null ? "n.v.t." : `${currentHandoverRate}%`,
      previousValue: previousHandoverRate === null ? "n.v.t." : `${previousHandoverRate}%`,
      deltaValue: handoverDelta === null ? "n.v.t." : `${formatSignedNumber(handoverDelta)} pp`,
      detail: "Percentage records met handoverbeslissing.",
      definition:
        "Week-op-week verschil in aandeel vaststellingen met ingevulde handoverkeuze.",
      tone: resolveDeltaTone(handoverDelta, true),
    },
    {
      key: "wow-low-score",
      label: "Records met score < 70",
      currentValue: `${currentLowScoreCount}`,
      previousValue: `${previousLowScoreCount}`,
      deltaValue: formatSignedNumber(lowScoreDelta),
      detail: "Lager is beter. Focuslijst voor kwaliteitsopvolging.",
      definition:
        "Aantal records onder kwaliteitsdrempel 70 in huidige week vergeleken met vorige week.",
      tone: resolveDeltaTone(lowScoreDelta, false),
    },
  ];
}
