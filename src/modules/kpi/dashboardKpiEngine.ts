import { diffCalendarDays, parseIsoDate } from "../../lib/dateUtils";
import type { DashboardKpiEngineInput, KpiCard } from "./types";

function getTopBucket(values: string[]): { label: string; count: number } | null {
  if (values.length === 0) {
    return null;
  }

  const counts = values.reduce<Record<string, number>>((acc, value) => {
    const key = value?.trim() || "Onbekend";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(counts).sort((a, b) => {
    if (b[1] !== a[1]) {
      return b[1] - a[1];
    }
    return a[0].localeCompare(b[0], "nl");
  });

  if (sorted.length === 0) {
    return null;
  }

  return { label: sorted[0][0], count: sorted[0][1] };
}

export function buildDashboardKpis(input: DashboardKpiEngineInput): KpiCard[] {
  const selectedDateValue = parseIsoDate(input.selectedDate);

  const startVisits = input.mapVisits.filter((visit) => visit.visitType === "START").length;
  const endVisits = input.mapVisits.filter((visit) => visit.visitType === "EIND").length;
  const betweenVisits = input.mapVisits.filter((visit) => visit.visitType === "TUSSEN").length;
  const mandatoryUnassigned = input.dispatch.unassigned.filter((visit) => visit.mandatory).length;

  const totalCandidates = input.dispatch.totals.plannedVisits + input.dispatch.unassigned.length;
  const assignmentRatePct =
    totalCandidates > 0
      ? Math.round((input.dispatch.totals.plannedVisits / totalCandidates) * 100)
      : null;

  const inspectorsInScope = input.inspectors.filter((inspector) =>
    input.visibleInspectorIds.size === 0 ? true : input.visibleInspectorIds.has(inspector.id)
  );

  const loadByInspector = inspectorsInScope.map((inspector) => ({
    id: inspector.id,
    initials: inspector.initials,
    load: (input.dispatch.visitsByInspector[inspector.id] ?? []).length,
  }));

  const inspectorsAtSoftLimit = loadByInspector.filter((entry) => entry.load >= 5).length;
  const inspectorsOverflow = loadByInspector.filter((entry) => entry.load >= 6).length;
  const maxLoad = loadByInspector.length > 0 ? Math.max(...loadByInspector.map((x) => x.load)) : 0;
  const minLoad = loadByInspector.length > 0 ? Math.min(...loadByInspector.map((x) => x.load)) : 0;
  const loadSpread = maxLoad - minLoad;

  const endingWithin3Days = input.contextWorks.filter((work) => {
    const daysToEnd = diffCalendarDays(selectedDateValue, parseIsoDate(work.endDate));
    return daysToEnd >= 0 && daysToEnd <= 3;
  }).length;

  const overdueInEffect = input.contextWorks.filter((work) => {
    if (work.status !== "IN EFFECT") {
      return false;
    }
    return diffCalendarDays(selectedDateValue, parseIsoDate(work.endDate)) < 0;
  }).length;

  const vergundStartsWithin7Days = input.contextWorks.filter((work) => {
    if (work.status !== "VERGUND") {
      return false;
    }
    const daysToStart = diffCalendarDays(selectedDateValue, parseIsoDate(work.startDate));
    return daysToStart >= 0 && daysToStart <= 7;
  }).length;

  const exactLocations = input.contextWorks.filter((work) => work.locationSource === "exact").length;
  const postcodeLocations = input.contextWorks.length - exactLocations;
  const exactLocationPct =
    input.contextWorks.length > 0 ? Math.round((exactLocations / input.contextWorks.length) * 100) : 0;

  const referentieComplete = input.contextWorks.filter(
    (work) => (work.referentieId ?? "").trim().length > 0
  ).length;
  const gipodComplete = input.contextWorks.filter(
    (work) => (work.gipodId ?? "").replace(/\D/g, "").length > 0
  ).length;
  const bothComplete = input.contextWorks.filter(
    (work) =>
      (work.referentieId ?? "").trim().length > 0 &&
      (work.gipodId ?? "").replace(/\D/g, "").length > 0
  ).length;

  const topDistrict = getTopBucket(input.contextWorks.map((work) => work.district));
  const topPostcode = getTopBucket(input.contextWorks.map((work) => work.postcode));

  return [
    {
      key: "start-visits",
      label: "Startbezoeken vandaag",
      value: `${startVisits}`,
      detail: "VisitType START",
    },
    {
      key: "end-visits",
      label: "Eindbezoeken vandaag",
      value: `${endVisits}`,
      detail: "VisitType EIND",
    },
    {
      key: "between-visits",
      label: "Tussenbezoeken vandaag",
      value: `${betweenVisits}`,
      detail: "VisitType TUSSEN",
    },
    {
      key: "assignment-rate",
      label: "Toewijzingsgraad",
      value: assignmentRatePct === null ? "n.v.t." : `${assignmentRatePct}%`,
      detail: `${input.dispatch.totals.plannedVisits}/${totalCandidates} toegewezen`,
    },
    {
      key: "mandatory-unassigned",
      label: "Niet-toegewezen verplicht",
      value: `${mandatoryUnassigned}`,
      detail: `${input.dispatch.unassigned.length} niet-toegewezen totaal`,
    },
    {
      key: "soft-capacity",
      label: "Capaciteitsdruk (>=5)",
      value: `${inspectorsAtSoftLimit}`,
      detail: `${inspectorsInScope.length} toezichters in scope`,
    },
    {
      key: "hard-capacity",
      label: "Overbelast (>=6)",
      value: `${inspectorsOverflow}`,
      detail: "Hard limit +1 overschrijding",
    },
    {
      key: "ending-soon",
      label: "Eindigt binnen 3 dagen",
      value: `${endingWithin3Days}`,
      detail: "Dossiers met nabij einddatum",
    },
    {
      key: "overdue-in-effect",
      label: "Over tijd (IN EFFECT)",
      value: `${overdueInEffect}`,
      detail: "Einddatum < geselecteerde datum",
    },
    {
      key: "vergund-starting",
      label: "Vergund start <=7 dagen",
      value: `${vergundStartsWithin7Days}`,
      detail: "Planningsdruk op korte termijn",
    },
    {
      key: "followup-open",
      label: "Follow-up open",
      value: `${input.filteredFollowUpCount}`,
      detail: "Wekelijkse opvolging na einde",
    },
    {
      key: "location-quality",
      label: "Locatiekwaliteit exact",
      value: `${exactLocationPct}%`,
      detail: `${exactLocations} exact / ${postcodeLocations} postcode`,
    },
    {
      key: "data-completeness",
      label: "Datacompleetheid",
      value: `${bothComplete}/${input.contextWorks.length}`,
      detail: `Ref ${referentieComplete} · GIPOD ${gipodComplete}`,
    },
    {
      key: "workload-spread",
      label: "Spreiding werkdruk",
      value: `${loadSpread}`,
      detail: `max ${maxLoad} - min ${minLoad}`,
    },
    {
      key: "top-district",
      label: "Top district",
      value: topDistrict ? topDistrict.label : "-",
      detail: topDistrict ? `${topDistrict.count} dossiers` : "Geen dossiers in filter",
    },
    {
      key: "top-postcode",
      label: "Top postcode",
      value: topPostcode ? topPostcode.label : "-",
      detail: topPostcode ? `${topPostcode.count} dossiers` : "Geen dossiers in filter",
    },
  ];
}
