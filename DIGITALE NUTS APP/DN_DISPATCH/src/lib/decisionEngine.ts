import { diffCalendarDays, parseIsoDate } from "./dateUtils";
import { computeImpactScore, type ImpactLevel, type ImpactProfile } from "./impactScoring";
import type { PlannedVisit } from "../types";

export type PriorityLevel = "LAAG" | "MIDDEL" | "HOOG";
export type RecommendedAction =
  | "Plan tussenbezoek"
  | "Controleer herstel"
  | "Escaleer"
  | "Afsluiten mogelijk";

export interface VisitDecision {
  priorityScore: number;
  priorityLevel: PriorityLevel;
  impactScore: number | null;
  impactLevel: ImpactLevel | null;
  impactReasons: string[];
  actionTypeLabel: string;
  insights: string[];
  recommendedAction: RecommendedAction;
  daysToEnd: number;
  progressPct: number;
  conflictDetected: boolean;
  onRouteToday: boolean;
  routeIndex?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function visitTypeLabel(visitType: PlannedVisit["visitType"]): string {
  switch (visitType) {
    case "START":
      return "STARTBEZOEK";
    case "EIND":
      return "EINDBEZOEK";
    default:
      return "TUSSENBEZOEK";
  }
}

function detectConflict(
  targetVisit: PlannedVisit,
  allVisits: PlannedVisit[],
  selectedDateIso: string
): boolean {
  const selectedDate = parseIsoDate(selectedDateIso);
  const sameInspector = allVisits.filter(
    (visit) => visit.inspectorId === targetVisit.inspectorId && visit.id !== targetVisit.id
  );

  if (sameInspector.length === 0) {
    return false;
  }

  const criticalCount = sameInspector.filter((visit) => {
    const daysToEnd = diffCalendarDays(selectedDate, parseIsoDate(visit.work.endDate));
    return daysToEnd <= 3;
  }).length;

  const samePostcodeCount = sameInspector.filter(
    (visit) => visit.work.postcode === targetVisit.work.postcode
  ).length;

  return criticalCount >= 2 || sameInspector.length >= 5 || samePostcodeCount >= 2;
}

function computeRecommendedAction(
  visit: PlannedVisit,
  daysToEnd: number,
  conflictDetected: boolean,
  priorityLevel: PriorityLevel
): RecommendedAction {
  if (daysToEnd <= 0) {
    return "Afsluiten mogelijk";
  }

  if (conflictDetected && priorityLevel === "HOOG") {
    return "Escaleer";
  }

  if (visit.visitType === "EIND" || daysToEnd <= 3) {
    return "Controleer herstel";
  }

  return "Plan tussenbezoek";
}

export function buildVisitDecision(
  visit: PlannedVisit,
  allVisits: PlannedVisit[],
  selectedDateIso: string,
  routeIndex?: number,
  impactProfile?: ImpactProfile
): VisitDecision {
  const selectedDate = parseIsoDate(selectedDateIso);
  const start = parseIsoDate(visit.work.startDate);
  const end = parseIsoDate(visit.work.endDate);
  const daysToEnd = diffCalendarDays(selectedDate, end);
  const totalDays = Math.max(1, diffCalendarDays(start, end));
  const elapsedDays = clamp(diffCalendarDays(start, selectedDate), 0, totalDays);
  const progressPct = clamp(Math.round((elapsedDays / totalDays) * 100), 0, 100);

  const onRouteToday = typeof routeIndex === "number";
  const conflictDetected = detectConflict(visit, allVisits, selectedDateIso);
  const impact = computeImpactScore(impactProfile);

  let score = 18;
  if (visit.mandatory) score += 20;
  if (visit.visitType === "START" || visit.visitType === "EIND") score += 10;
  if (daysToEnd <= 3) score += 30;
  else if (daysToEnd <= 14) score += 18;
  if (onRouteToday) score += 8;
  if (typeof routeIndex === "number" && routeIndex <= 3) score += 6;
  if (conflictDetected) score += 16;
  if (visit.work.locationSource === "postcode") score += 4;
  if (visit.work.status === "VERGUND") score += 6;
  if (daysToEnd <= 0) score += 12;
  if (impact) score += impact.priorityDelta;
  score = clamp(score, 0, 100);

  const priorityLevel: PriorityLevel = score >= 70 ? "HOOG" : score >= 45 ? "MIDDEL" : "LAAG";

  const insights: string[] = [];
  if (daysToEnd <= 14) {
    insights.push(`Binnen ${Math.max(daysToEnd, 0)} dagen einddatum`);
  }
  if (visit.visitType === "TUSSEN") {
    insights.push("Cadansbezoek vereist vandaag");
  }
  if (onRouteToday && typeof routeIndex === "number") {
    insights.push(`Ligt op route vandaag (#${routeIndex})`);
  }
  if (conflictDetected) {
    insights.push("Conflicteert met ander dossier");
  }
  if (impact) {
    insights.push(`Maatschappelijke impact: ${impact.level} (${impact.score})`);
  }

  return {
    priorityScore: score,
    priorityLevel,
    impactScore: impact ? impact.score : null,
    impactLevel: impact ? impact.level : null,
    impactReasons: impact ? impact.reasons : [],
    actionTypeLabel: visitTypeLabel(visit.visitType),
    insights: insights.slice(0, 3),
    recommendedAction: computeRecommendedAction(visit, daysToEnd, conflictDetected, priorityLevel),
    daysToEnd,
    progressPct,
    conflictDetected,
    onRouteToday,
    routeIndex,
  };
}
