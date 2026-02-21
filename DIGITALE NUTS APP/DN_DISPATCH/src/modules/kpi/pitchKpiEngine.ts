import { getIsoWeekBounds, getRecordDateKey, resolveRecordChecklistScore } from "./recordMetrics";
import type { KpiCard, PitchKpiEngineInput } from "./types";

export function buildPitchKpis(input: PitchKpiEngineInput): KpiCard[] {
  const inspectorScopeIds =
    input.terrainMode && input.activeInspectorSession
      ? new Set([input.activeInspectorSession.inspectorId])
      : input.visibleInspectorIds;

  const recordsInScope = input.records.filter((record) =>
    inspectorScopeIds.size === 0 ? true : inspectorScopeIds.has(record.inspectorSession.inspectorId)
  );

  const contextCompleteCount = recordsInScope.filter((record) => {
    const context = record.immutableContext;
    const hasAddress = [context.straat, context.huisnr, context.postcode].every(
      (value) => `${value ?? ""}`.trim().length > 0
    );
    const hasNuts = (context.nutsBedrijf ?? "").trim().length > 0;
    const hasReferentie = (context.referentieId ?? "").trim().length > 0;
    const hasGipod = (context.gipodId ?? "").replace(/\D/g, "").length > 0;
    return hasAddress && hasNuts && hasReferentie && hasGipod;
  }).length;

  const handoverCount = recordsInScope.filter(
    (record) => (record.mutablePayload.handoverDecision ?? "").trim().length > 0
  ).length;

  const contextCompletePct =
    recordsInScope.length > 0 ? Math.round((contextCompleteCount / recordsInScope.length) * 100) : 0;
  const handoverPct =
    recordsInScope.length > 0 ? Math.round((handoverCount / recordsInScope.length) * 100) : 0;

  const checklistScores = recordsInScope.map((record) => resolveRecordChecklistScore(record));
  const avgChecklistScore =
    checklistScores.length > 0
      ? Math.round(checklistScores.reduce((sum, value) => sum + value, 0) / checklistScores.length)
      : null;
  const checklistLowCount = checklistScores.filter((score) => score < 70).length;

  const queueStats = {
    queued: input.syncQueue.filter((item) => item.status === "queued").length,
    failed: input.syncQueue.filter((item) => item.status === "failed").length,
    synced: input.syncQueue.filter((item) => item.status === "synced").length,
  };

  const weekBounds = getIsoWeekBounds(input.selectedDate);
  const weeklyByInspector = new Map<string, number>();

  for (const record of recordsInScope) {
    const dateKey = getRecordDateKey(record);
    if (!dateKey) {
      continue;
    }

    if (dateKey < weekBounds.startIso || dateKey > weekBounds.endIso) {
      continue;
    }

    const inspectorLabel =
      record.inspectorSession.inspectorInitials || record.inspectorSession.inspectorName || "Onbekend";
    weeklyByInspector.set(inspectorLabel, (weeklyByInspector.get(inspectorLabel) ?? 0) + 1);
  }

  const weeklyInspectorEntries = [...weeklyByInspector.entries()].sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0], "nl");
  });
  const weeklyTotal = weeklyInspectorEntries.reduce((sum, [, count]) => sum + count, 0);
  const weeklyDetail =
    weeklyInspectorEntries.length > 0
      ? weeklyInspectorEntries.map(([label, count]) => `${label} ${count}`).join(" · ")
      : "Geen vaststellingen in deze week.";

  const topPriorityDossiers = [...input.mapVisits]
    .sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      const scoreA = input.impactByVisitId[a.id]?.score ?? -1;
      const scoreB = input.impactByVisitId[b.id]?.score ?? -1;
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return a.work.endDate.localeCompare(b.work.endDate);
    })
    .slice(0, 5)
    .map((visit) => visit.work.dossierId);

  return [
    {
      key: "pitch-dossiers-scope",
      label: "Dossiers in scope",
      value: `${input.contextWorksCount}`,
      detail: "Resultaat van status, district en postcodefilters.",
      definition: "Totaal dossiers binnen actieve contextfilters.",
    },
    {
      key: "pitch-inspections-week",
      label: "Vaststellingen per toezichter (huidige week)",
      value: `${weeklyTotal}`,
      detail: weeklyDetail,
      definition:
        "Aantal vaststellingen in de week van de gekozen dispatchdatum, gegroepeerd per toezichter.",
    },
    {
      key: "pitch-context-quality",
      label: "% records met context (adres + nutsmaatschappij + referentie + GIPOD)",
      value: `${contextCompletePct}%`,
      detail: `${contextCompleteCount}/${recordsInScope.length} records context-volledig.`,
      definition:
        "Percentage vaststellingen met volledige contextvelden voor dossiertraceerbaarheid.",
    },
    {
      key: "pitch-handover-complete",
      label: "% handover ingevuld",
      value: `${handoverPct}%`,
      detail: `${handoverCount}/${recordsInScope.length} records met handoverbeslissing.`,
      definition: "Percentage vaststellingen met expliciete handoverkeuze.",
    },
    {
      key: "pitch-checklist-score",
      label: "Gemiddelde checklistscore (0-100)",
      value: avgChecklistScore === null ? "n.v.t." : `${avgChecklistScore}`,
      detail:
        avgChecklistScore === null
          ? "Geen records in scope."
          : `${checklistLowCount} record(s) onder 70.`,
      definition:
        "Gewogen score op basis van OK/NOK, ontbrekende checklistchecks en ontbrekende NOK-verantwoordelijke.",
    },
    {
      key: "pitch-queue-status",
      label: "Queue: queued / failed / synced",
      value: `${queueStats.queued} / ${queueStats.failed} / ${queueStats.synced}`,
      detail: `${input.syncQueue.length} items in sync queue.`,
      definition: "Actuele statusverdeling van de DN Vaststelling sync-wachtrij.",
    },
    {
      key: "pitch-top-priority",
      label: "Top 5 prioriteitsdossiers",
      value: `${topPriorityDossiers.length}`,
      detail:
        topPriorityDossiers.length > 0
          ? topPriorityDossiers.join(", ")
          : "Geen prioriteitsdossiers in huidige context.",
      definition:
        "Top 5 dossiers op basis van dispatchprioriteit en impactscore in de huidige kaartcontext.",
    },
  ];
}
