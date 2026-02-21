import {
  IMPACT_DENSITY_MAX,
  IMPACT_DENSITY_MIN,
  IMPACT_PRIORITY_FACTOR,
  IMPACT_WEIGHTS,
} from "../config/impactWeights";

export type ImpactLevel = "LAAG" | "MIDDEL" | "HOOG";

export interface ImpactIndicators {
  inShortageGreenZone: boolean;
  inShortageServiceZone: boolean;
  inFlaneerzone: boolean;
  parkingTariffColor: string | null;
  parkingZoneCode: string | null;
  parkingZoneName: string | null;
  error?: string;
}

export interface ImpactProfile {
  areaId: string;
  areaLabel: string;
  district: string | null;
  worksCount: number;
  asOfDate: string | null;
  sourceAreaId: string | null;
  sourceAreaLabel: string | null;
  populationDensity: number | null;
  vulnerableShare: number | null;
  servicePressure: number | null;
  mobilitySensitivity: number | null;
  indicators: ImpactIndicators;
}

export interface ImpactDataFile {
  generatedAt: string;
  source: {
    project: string;
    method: string;
    layers: Record<string, string>;
  };
  summary: {
    totalProfiles: number;
    fallbackProfiles: number;
    profilesWithDensity: number;
    minDensity: number | null;
    maxDensity: number | null;
  };
  profiles: ImpactProfile[];
}

export interface ImpactScoreResult {
  score: number;
  level: ImpactLevel;
  priorityDelta: number;
  reasons: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeDensity(value: number | null): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  const normalized =
    (numeric - IMPACT_DENSITY_MIN) / (IMPACT_DENSITY_MAX - IMPACT_DENSITY_MIN);
  return clamp(normalized, 0, 1);
}

function normalizeRatio(value: number | null): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return clamp(numeric, 0, 1);
}

function impactLevel(score: number): ImpactLevel {
  if (score >= 70) {
    return "HOOG";
  }
  if (score >= 40) {
    return "MIDDEL";
  }
  return "LAAG";
}

function buildReasons(
  densityN: number,
  vulnerableN: number,
  serviceN: number,
  mobilityN: number
): string[] {
  const reasons: string[] = [];

  if (densityN >= 0.7) {
    reasons.push("Hoge bevolkingsdichtheid in de zone");
  }
  if (vulnerableN >= 0.7) {
    reasons.push("Signaal van verhoogde kwetsbaarheid");
  }
  if (serviceN >= 0.7) {
    reasons.push("Tekortzone voor voorzieningen in de buurt");
  }
  if (mobilityN >= 0.7) {
    reasons.push("Hoge mobiliteitssensitiviteit op locatie");
  }

  if (reasons.length === 0) {
    reasons.push("Beperkte maatschappelijke impactsignalen");
  }

  return reasons.slice(0, 3);
}

export function computeImpactScore(profile: ImpactProfile | undefined): ImpactScoreResult | null {
  if (!profile) {
    return null;
  }

  const densityN = normalizeDensity(profile.populationDensity);
  const vulnerableN = normalizeRatio(profile.vulnerableShare);
  const serviceN = normalizeRatio(profile.servicePressure);
  const mobilityN = normalizeRatio(profile.mobilitySensitivity);

  const weighted =
    IMPACT_WEIGHTS.populationDensity * densityN +
    IMPACT_WEIGHTS.vulnerableShare * vulnerableN +
    IMPACT_WEIGHTS.servicePressure * serviceN +
    IMPACT_WEIGHTS.mobilitySensitivity * mobilityN;

  const score = clamp(Math.round(weighted * 100), 0, 100);
  return {
    score,
    level: impactLevel(score),
    priorityDelta: Math.round(score * IMPACT_PRIORITY_FACTOR),
    reasons: buildReasons(densityN, vulnerableN, serviceN, mobilityN),
  };
}
