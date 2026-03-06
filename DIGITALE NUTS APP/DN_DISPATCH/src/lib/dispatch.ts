import { DEFAULT_CENTER, POSTCODE_CENTROIDS } from "../config/postcodeCentroids";
import {
  addDays,
  adjustToWorkday,
  diffCalendarDays,
  formatIsoDate,
  isWorkday,
  parseIsoDate,
  sameDate,
  workdaysBetween,
} from "./dateUtils";
import { buildOperationalWorkFilterOptions, filterWorks } from "./workFiltering";
import type {
  DispatchCapacitySettings,
  DispatchPlan,
  FollowUpTask,
  GIPODPermitStatus,
  Inspector,
  InspectorAssignmentRole,
  InspectorCapacityOverride,
  PlannedVisit,
  VisitType,
  WorkRecord,
  WorkStatus,
} from "../types";

const DEFAULT_SOFT_DAILY_LIMIT = 5;
const DEFAULT_HARD_DAILY_LIMIT = 6;
const DEFAULT_STANDARD_VISIT_WEIGHT = 1;
const DEFAULT_COMPLEX_VISIT_WEIGHT = 1.5;
const DEFAULT_FIXED_DAILY_LOAD = 0;
const DEFAULT_EXPERIENCE_FACTOR = 1;
const MIN_DAILY_LIMIT = 1;
const MAX_DAILY_LIMIT = 20;
const MIN_VISIT_WEIGHT = 0.25;
const MAX_VISIT_WEIGHT = 4;
const MIN_FIXED_DAILY_LOAD = 0;
const MAX_FIXED_DAILY_LOAD = 12;
const MIN_EXPERIENCE_FACTOR = 0.5;
const MAX_EXPERIENCE_FACTOR = 1.5;
const PREFERRED_INSPECTOR_SCORE_BONUS = 340;
const MAX_CATEGORY3_ASSIGNMENT_SHARE = 0.15;
const DEFAULT_WEEKLY_FAIRNESS_WEIGHT = 18;
const MIN_WEEKLY_FAIRNESS_WEIGHT = 0;
const MAX_WEEKLY_FAIRNESS_WEIGHT = 50;
const ENFORCE_CATEGORY3_ASSIGNMENT_SHARE = false;
export const DISPATCH_EXCLUDE_PERMIT_EXPIRED_VIOLATIONS = true;
const ENABLE_ACTIVE_COVERAGE_TOP_UP = true;
const ACTIVE_COVERAGE_TARGET_RATIO = 0.75;

type Candidate = {
  work: WorkRecord;
  visitType: VisitType;
  mandatory: boolean;
  priority: number;
};

export type DispatchOptions = {
  date: string;
  works: WorkRecord[];
  inspectors: Inspector[];
  holidays: string[];
  statuses: WorkStatus[];
  sourceStatuses?: string[];
  gipodCategories?: string[];
  permitStatuses?: GIPODPermitStatus[];
  districts: string[];
  postcodes: string[];
  stickyInspectorByWorkId?: Record<string, string>;
  manualInspectorByWorkId?: Record<string, string>;
  unavailableInspectorIds?: string[];
  dispatchCapacity?: DispatchCapacitySettings;
  weeklyAssignedVisitsByInspector?: Record<string, number>;
  weeklyFairnessWeight?: number;
};

type InspectorPick = {
  inspector: Inspector;
  score: number;
};

type InspectorRoutingState = {
  latSum: number;
  lngSum: number;
  count: number;
};

type RuntimeDispatchCapacity = {
  softDailyLimit: number;
  hardDailyLimit: number;
  standardVisitWeight: number;
  complexVisitWeight: number;
  inspectorOverrides: Record<string, InspectorCapacityOverride>;
};

type InspectorCapacityProfile = {
  softDailyLimit: number;
  hardDailyLimit: number;
  fixedDailyLoad: number;
  experienceFactor: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function normalizeDispatchCapacity(
  raw: DispatchCapacitySettings | undefined
): RuntimeDispatchCapacity {
  const softDailyLimit = clamp(
    Math.round(raw?.softDailyLimit ?? DEFAULT_SOFT_DAILY_LIMIT),
    MIN_DAILY_LIMIT,
    MAX_DAILY_LIMIT
  );
  const hardDailyLimit = clamp(
    Math.round(raw?.hardDailyLimit ?? DEFAULT_HARD_DAILY_LIMIT),
    softDailyLimit,
    MAX_DAILY_LIMIT
  );
  const standardVisitWeight = round(
    clamp(raw?.standardVisitWeight ?? DEFAULT_STANDARD_VISIT_WEIGHT, MIN_VISIT_WEIGHT, MAX_VISIT_WEIGHT)
  );
  const complexVisitWeight = round(
    clamp(raw?.complexVisitWeight ?? DEFAULT_COMPLEX_VISIT_WEIGHT, standardVisitWeight, MAX_VISIT_WEIGHT)
  );

  return {
    softDailyLimit,
    hardDailyLimit,
    standardVisitWeight,
    complexVisitWeight,
    inspectorOverrides: raw?.inspectorOverrides ?? {},
  };
}

function resolveInspectorCapacityProfile(
  inspectorId: string,
  capacity: RuntimeDispatchCapacity
): InspectorCapacityProfile {
  const override = capacity.inspectorOverrides[inspectorId];
  const softDailyLimit =
    override?.softDailyLimit === undefined
      ? capacity.softDailyLimit
      : clamp(Math.round(override.softDailyLimit), MIN_DAILY_LIMIT, MAX_DAILY_LIMIT);
  const hardDailyLimit =
    override?.hardDailyLimit === undefined
      ? capacity.hardDailyLimit
      : clamp(Math.round(override.hardDailyLimit), softDailyLimit, MAX_DAILY_LIMIT);
  const fixedDailyLoad =
    override?.fixedDailyLoad === undefined
      ? DEFAULT_FIXED_DAILY_LOAD
      : round(clamp(override.fixedDailyLoad, MIN_FIXED_DAILY_LOAD, MAX_FIXED_DAILY_LOAD));
  const experienceFactor =
    override?.experienceFactor === undefined
      ? DEFAULT_EXPERIENCE_FACTOR
      : round(
          clamp(override.experienceFactor, MIN_EXPERIENCE_FACTOR, MAX_EXPERIENCE_FACTOR)
        );

  return {
    softDailyLimit,
    hardDailyLimit,
    fixedDailyLoad,
    experienceFactor,
  };
}

function isComplexWorkForLoad(work: WorkRecord): boolean {
  const category = (work.gipodCategorie ?? "").trim().toLowerCase();
  return (
    category.includes("categorie 1") ||
    category.includes("categorie 2") ||
    category.includes("dringend")
  );
}

function isCategory3Work(work: WorkRecord): boolean {
  const category = (work.gipodCategorie ?? "").trim().toLowerCase();
  return category === "categorie 3" || category === "cat 3" || category === "categorie3";
}

function isSignalisatiePriorityWork(work: WorkRecord): boolean {
  if ((work.sourceDataset ?? "").trim().toLowerCase() === "weekrapport_fallback") {
    return true;
  }

  if ((work.permitRefKey ?? "").trim() || (work.permitReferenceId ?? "").trim()) {
    return true;
  }

  const permitStatus = (work.permitStatus ?? "").trim().toUpperCase();
  return (
    permitStatus === "AFGELEVERD" ||
    permitStatus === "IN_VOORBEREIDING" ||
    permitStatus === "GEWEIGERD_OF_STOPGEZET"
  );
}

function getStrategicProjectPriority(work: WorkRecord): number {
  if (isCategory3Work(work)) {
    return 0;
  }

  if (isSignalisatiePriorityWork(work)) {
    return 2;
  }

  return 1;
}

function canAssignCategory3Visit(
  assignedCategory3Visits: number,
  assignedNonCategory3Visits: number
): boolean {
  const projectedCategory3Visits = assignedCategory3Visits + 1;
  const projectedTotalVisits = assignedCategory3Visits + assignedNonCategory3Visits + 1;
  return projectedCategory3Visits / projectedTotalVisits <= MAX_CATEGORY3_ASSIGNMENT_SHARE;
}

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadiusKm * c;
}

function getInspectorCentroid(inspector: Inspector): { lat: number; lng: number } {
  const points = inspector.primaryPostcodes
    .map((postcode) => POSTCODE_CENTROIDS[postcode])
    .filter((point): point is { lat: number; lng: number } => Boolean(point));

  if (points.length === 0) {
    return DEFAULT_CENTER;
  }

  const total = points.reduce(
    (acc, point) => ({ lat: acc.lat + point.lat, lng: acc.lng + point.lng }),
    { lat: 0, lng: 0 }
  );

  return {
    lat: total.lat / points.length,
    lng: total.lng / points.length,
  };
}

function resolveWorkLocation(work: WorkRecord): { lat: number; lng: number } {
  if (work.location && Number.isFinite(work.location.lat) && Number.isFinite(work.location.lng)) {
    return work.location;
  }

  return POSTCODE_CENTROIDS[work.postcode] ?? DEFAULT_CENTER;
}

function isPrimaryInspectorForWork(work: WorkRecord, inspector: Inspector): boolean {
  return inspector.primaryPostcodes.includes(work.postcode);
}

function isBackupInspectorForWork(work: WorkRecord, inspector: Inspector): boolean {
  return inspector.backupPostcodes.includes(work.postcode);
}

function resolveInspectorAssignmentRole(
  work: WorkRecord,
  inspector: Inspector
): InspectorAssignmentRole {
  if (isPrimaryInspectorForWork(work, inspector)) {
    return "DEDICATED";
  }

  if (isBackupInspectorForWork(work, inspector)) {
    return "BACKUP";
  }

  return "RESERVE";
}

function isInspectorActiveForDate(inspector: Inspector, date: string): boolean {
  if (inspector.activeFrom && date < inspector.activeFrom) {
    return false;
  }

  if (inspector.activeUntil && date > inspector.activeUntil) {
    return false;
  }

  return true;
}

function scoreInspectorForWork(
  work: WorkRecord,
  inspector: Inspector,
  centroid: { lat: number; lng: number },
  currentLoad: number,
  preferredInspectorId?: string,
  assignedPostcodes?: Set<string>
): number {
  let score = 0;
  const isPrimary = isPrimaryInspectorForWork(work, inspector);
  const isBackup = isBackupInspectorForWork(work, inspector);
  const isPreferredInspector = Boolean(preferredInspectorId && inspector.id === preferredInspectorId);

  if (isPrimary) {
    score += 180;
  } else if (isBackup) {
    score += 110;
  } else {
    score -= 120;
  }

  if (isPreferredInspector) {
    // Sterke bonus voor continuiteit: zelfde toezichter blijft zoveel mogelijk op dezelfde werf.
    score += PREFERRED_INSPECTOR_SCORE_BONUS;
  }

  if (assignedPostcodes && assignedPostcodes.size > 0) {
    if (assignedPostcodes.has(work.postcode)) {
      score += 42;
    } else if (!isPrimary && !isBackup) {
      score -= 62;
    }
  }

  const workPoint = resolveWorkLocation(work);
  const distanceKm = haversineKm(workPoint, centroid);
  const distanceWeight = isPrimary ? 3 : isBackup ? 5 : 8.5;
  const distancePenalty = distanceKm * distanceWeight;
  score -= distancePenalty;
  score -= currentLoad * 18;

  if (currentLoad > 0 && !isPrimary && !isBackup && !isPreferredInspector) {
    score -= 55;
  }

  return score;
}

function buildPreferredInspectorMap(
  works: WorkRecord[],
  inspectors: Inspector[],
  centroids: Map<string, { lat: number; lng: number }>,
  stickyInspectorByWorkId: Record<string, string>
): Record<string, string> {
  const preferred: Record<string, string> = {};
  const validInspectorIds = new Set(inspectors.map((inspector) => inspector.id));

  const ordered = [...works].sort((a, b) => {
    if (a.startDate !== b.startDate) {
      return a.startDate.localeCompare(b.startDate);
    }
    return a.id.localeCompare(b.id);
  });

  for (const work of ordered) {
    const stickyInspectorId = stickyInspectorByWorkId[work.id];
    if (stickyInspectorId && validInspectorIds.has(stickyInspectorId)) {
      preferred[work.id] = stickyInspectorId;
      continue;
    }

    const workPoint = resolveWorkLocation(work);
    const bestInspector = [...inspectors].sort((a, b) => {
      const aRole = isPrimaryInspectorForWork(work, a)
        ? 0
        : isBackupInspectorForWork(work, a)
          ? 1
          : a.isReserve
            ? 3
            : 2;
      const bRole = isPrimaryInspectorForWork(work, b)
        ? 0
        : isBackupInspectorForWork(work, b)
          ? 1
          : b.isReserve
            ? 3
            : 2;

      if (aRole !== bRole) {
        return aRole - bRole;
      }

      const aCentroid = centroids.get(a.id) ?? DEFAULT_CENTER;
      const bCentroid = centroids.get(b.id) ?? DEFAULT_CENTER;
      const distanceDelta =
        haversineKm(workPoint, aCentroid) - haversineKm(workPoint, bCentroid);
      if (Math.abs(distanceDelta) > 0.001) {
        return distanceDelta;
      }

      return a.id.localeCompare(b.id, "nl-BE");
    })[0] ?? null;

    if (bestInspector) {
      preferred[work.id] = bestInspector.id;
    }
  }

  return preferred;
}

function isWorkActiveOnDate(work: WorkRecord, selectedDate: Date): boolean {
  const start = parseIsoDate(work.startDate);
  const end = parseIsoDate(work.endDate);
  return selectedDate >= start && selectedDate <= end;
}

function sortCandidates(candidates: Candidate[]): Candidate[] {
  candidates.sort((a, b) => {
    const strategicPriorityDiff =
      getStrategicProjectPriority(b.work) - getStrategicProjectPriority(a.work);
    if (strategicPriorityDiff !== 0) {
      return strategicPriorityDiff;
    }

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    const aEnd = parseIsoDate(a.work.endDate);
    const bEnd = parseIsoDate(b.work.endDate);
    return aEnd.getTime() - bEnd.getTime();
  });

  return candidates;
}

function buildCoverageTopUpCandidates(
  selectedDate: Date,
  works: WorkRecord[],
  existingCandidates: Candidate[],
  targetCandidateCount: number
): Candidate[] {
  const missingCount = targetCandidateCount - existingCandidates.length;
  if (missingCount <= 0) {
    return [];
  }

  const existingWorkIds = new Set(existingCandidates.map((candidate) => candidate.work.id));
  const topUpPool: Candidate[] = [];

  for (const work of works) {
    if (existingWorkIds.has(work.id)) {
      continue;
    }

    if (!isWorkActiveOnDate(work, selectedDate)) {
      continue;
    }

    topUpPool.push({
      work,
      visitType: "TUSSEN",
      mandatory: false,
      priority: 66,
    });
  }

  sortCandidates(topUpPool);
  return topUpPool.slice(0, missingCount);
}

function buildCandidates(
  selectedDate: Date,
  works: WorkRecord[],
  holidays: Set<string>
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const work of works) {
    if (!isWorkActiveOnDate(work, selectedDate)) {
      continue;
    }

    const start = parseIsoDate(work.startDate);
    const end = parseIsoDate(work.endDate);

    const adjustedStart = adjustToWorkday(start, "forward", holidays);
    const adjustedEnd = adjustToWorkday(end, "backward", holidays);

    if (sameDate(selectedDate, adjustedStart)) {
      candidates.push({ work, visitType: "START", mandatory: true, priority: 120 });
      continue;
    }

    if (sameDate(selectedDate, adjustedEnd)) {
      candidates.push({ work, visitType: "EIND", mandatory: true, priority: 116 });
      continue;
    }

    const workdayIndex = workdaysBetween(adjustedStart, selectedDate, holidays);
    const cadenceDue = workdayIndex % 2 === 0;

    if (cadenceDue) {
      candidates.push({ work, visitType: "TUSSEN", mandatory: false, priority: 80 });
    }
  }

  return sortCandidates(candidates);
}

type InspectorPools = {
  primary: Inspector[];
  backup: Inspector[];
  reserve: Inspector[];
  emergency: Inspector[];
};

function buildInspectorPools(
  candidate: Candidate,
  inspectors: Inspector[]
): InspectorPools {
  const primary = inspectors.filter((inspector) =>
    isPrimaryInspectorForWork(candidate.work, inspector)
  );
  const primaryIds = new Set(primary.map((inspector) => inspector.id));
  const backup = inspectors.filter(
    (inspector) =>
      !primaryIds.has(inspector.id) && isBackupInspectorForWork(candidate.work, inspector)
  );
  const dedicatedCoverageCount = primary.length + backup.length;

  if (dedicatedCoverageCount === inspectors.length) {
    return {
      primary,
      backup,
      reserve: [],
      emergency: [],
    };
  }

  const poolIds = new Set([...primary, ...backup].map((inspector) => inspector.id));
  const reserve = inspectors.filter(
    (inspector) => !poolIds.has(inspector.id) && inspector.isReserve === true
  );
  const hasExplicitReserves = inspectors.some((inspector) => inspector.isReserve === true);
  const emergency = hasExplicitReserves
    ? []
    : inspectors.filter((inspector) => !poolIds.has(inspector.id));

  return {
    primary,
    backup,
    reserve,
    emergency,
  };
}

function pickInspector(
  candidate: Candidate,
  inspectorPool: Inspector[],
  loads: Map<string, number>,
  capacityProfileByInspectorId: Map<string, InspectorCapacityProfile>,
  centroids: Map<string, { lat: number; lng: number }>,
  routeStateByInspector: Map<string, InspectorRoutingState>,
  assignedPostcodesByInspector: Map<string, Set<string>>,
  weeklyAssignedVisitsByInspector: Map<string, number>,
  weeklyFairnessWeight: number,
  preferredInspectorId: string | undefined,
  allowOverflow: boolean
): InspectorPick | null {
  let best: InspectorPick | null = null;
  const weeklyBaselineRaw = inspectorPool.reduce((min, inspector) => {
    const weeklyCount = weeklyAssignedVisitsByInspector.get(inspector.id) ?? 0;
    return Math.min(min, weeklyCount);
  }, Number.POSITIVE_INFINITY);
  const weeklyBaseline = Number.isFinite(weeklyBaselineRaw) ? weeklyBaselineRaw : 0;

  for (const inspector of inspectorPool) {
    const currentLoad = loads.get(inspector.id) ?? 0;
    const capacityProfile = capacityProfileByInspectorId.get(inspector.id);
    const hardLimit = capacityProfile?.hardDailyLimit ?? DEFAULT_HARD_DAILY_LIMIT;
    const softLimit = capacityProfile?.softDailyLimit ?? DEFAULT_SOFT_DAILY_LIMIT;

    if (currentLoad >= hardLimit) {
      continue;
    }

    if (!allowOverflow && currentLoad >= softLimit) {
      continue;
    }

    const routeState = routeStateByInspector.get(inspector.id);
    const centroid =
      routeState && routeState.count > 0
        ? {
            lat: routeState.latSum / routeState.count,
            lng: routeState.lngSum / routeState.count,
          }
        : centroids.get(inspector.id) ?? DEFAULT_CENTER;

    let score = scoreInspectorForWork(
      candidate.work,
      inspector,
      centroid,
      currentLoad,
      preferredInspectorId,
      assignedPostcodesByInspector.get(inspector.id)
    );

    if (candidate.mandatory) {
      score += 14;
    }

    if (weeklyFairnessWeight > 0) {
      const weeklyCount = weeklyAssignedVisitsByInspector.get(inspector.id) ?? 0;
      const fairnessDelta = Math.max(0, weeklyCount - weeklyBaseline);
      score -= fairnessDelta * weeklyFairnessWeight;
    }

    if (best === null || score > best.score) {
      best = { inspector, score };
    }
  }

  return best;
}

function createUnassignedVisit(candidate: Candidate, date: string): PlannedVisit {
  return {
    id: `${candidate.work.id}-${date}-${candidate.visitType}-unassigned`,
    work: candidate.work,
    visitType: candidate.visitType,
    mandatory: candidate.mandatory,
    priority: candidate.priority,
    inspectorId: "UNASSIGNED",
    inspectorInitials: "--",
    inspectorName: "Niet toegewezen",
    inspectorColor: "#6b7280",
    score: -1,
  };
}

function pickInspectorForFollowUp(
  work: WorkRecord,
  inspectors: Inspector[],
  preferredInspectorByWorkId: Record<string, string>
): Inspector {
  const preferredId = preferredInspectorByWorkId[work.id];
  if (preferredId) {
    const preferredInspector = inspectors.find((inspector) => inspector.id === preferredId);
    if (preferredInspector) {
      return preferredInspector;
    }
  }

  const direct = inspectors.find((inspector) => inspector.primaryPostcodes.includes(work.postcode));
  if (direct) {
    return direct;
  }

  const backup = inspectors.find((inspector) => inspector.backupPostcodes.includes(work.postcode));
  if (backup) {
    return backup;
  }

  const workPoint = resolveWorkLocation(work);

  const sorted = [...inspectors].sort((a, b) => {
    const distA = haversineKm(workPoint, getInspectorCentroid(a));
    const distB = haversineKm(workPoint, getInspectorCentroid(b));
    return distA - distB;
  });

  return sorted[0] ?? inspectors[0];
}

export function buildDispatchPlan(options: DispatchOptions): DispatchPlan {
  const selectedDate = parseIsoDate(options.date);
  const selectedDateIso = formatIsoDate(selectedDate);
  const holidaySet = new Set(options.holidays);
  const workday = isWorkday(selectedDate, holidaySet);
  const unavailableInspectorIds = new Set(options.unavailableInspectorIds ?? []);
  const runtimeCapacity = normalizeDispatchCapacity(options.dispatchCapacity);
  const weeklyFairnessWeight = clamp(
    round(options.weeklyFairnessWeight ?? DEFAULT_WEEKLY_FAIRNESS_WEIGHT),
    MIN_WEEKLY_FAIRNESS_WEIGHT,
    MAX_WEEKLY_FAIRNESS_WEIGHT
  );
  const weeklyAssignedVisitsSeed = options.weeklyAssignedVisitsByInspector ?? {};
  const activeInspectors = options.inspectors.filter(
    (inspector) =>
      !unavailableInspectorIds.has(inspector.id) &&
      isInspectorActiveForDate(inspector, selectedDateIso)
  );

  const filteredWorksResolved = filterWorks(
    options.works,
    buildOperationalWorkFilterOptions({
      statuses: options.statuses,
      sourceStatuses: options.sourceStatuses,
      gipodCategories: options.gipodCategories,
      permitStatuses: options.permitStatuses,
      districts: options.districts,
      postcodes: options.postcodes,
      excludePermitExpiredViolations: DISPATCH_EXCLUDE_PERMIT_EXPIRED_VIOLATIONS,
    })
  );

  const visitsByInspector: Record<string, PlannedVisit[]> = {};
  const followUpsByInspector: Record<string, FollowUpTask[]> = {};
  const loads = new Map<string, number>();
  const capacityProfileByInspectorId = new Map<string, InspectorCapacityProfile>();
  const centroids = new Map<string, { lat: number; lng: number }>();
  const routeStateByInspector = new Map<string, InspectorRoutingState>();
  const assignedPostcodesByInspector = new Map<string, Set<string>>();
  const weeklyAssignedVisitsByInspector = new Map<string, number>();

  for (const inspector of options.inspectors) {
    visitsByInspector[inspector.id] = [];
    followUpsByInspector[inspector.id] = [];
    if (
      !unavailableInspectorIds.has(inspector.id) &&
      isInspectorActiveForDate(inspector, selectedDateIso)
    ) {
      const capacityProfile = resolveInspectorCapacityProfile(inspector.id, runtimeCapacity);
      capacityProfileByInspectorId.set(inspector.id, capacityProfile);
      loads.set(inspector.id, capacityProfile.fixedDailyLoad);
      centroids.set(inspector.id, getInspectorCentroid(inspector));
      routeStateByInspector.set(inspector.id, { latSum: 0, lngSum: 0, count: 0 });
      assignedPostcodesByInspector.set(inspector.id, new Set());
      const historicalCountRaw = Number(weeklyAssignedVisitsSeed[inspector.id]);
      const historicalCount = Number.isFinite(historicalCountRaw)
        ? Math.max(0, Math.round(historicalCountRaw))
        : 0;
      weeklyAssignedVisitsByInspector.set(inspector.id, historicalCount);
    }
  }

  const preferredInspectorByWorkId = buildPreferredInspectorMap(
    filteredWorksResolved,
    activeInspectors,
    centroids,
    options.stickyInspectorByWorkId ?? {}
  );

  const unassigned: PlannedVisit[] = [];

  if (workday) {
    let candidates = buildCandidates(selectedDate, filteredWorksResolved, holidaySet);
    if (ENABLE_ACTIVE_COVERAGE_TOP_UP) {
      const activeWorksOnDateCount = filteredWorksResolved.reduce(
        (sum, work) => (isWorkActiveOnDate(work, selectedDate) ? sum + 1 : sum),
        0
      );
      const targetCandidateCount = Math.ceil(activeWorksOnDateCount * ACTIVE_COVERAGE_TARGET_RATIO);
      if (targetCandidateCount > candidates.length) {
        const topUpCandidates = buildCoverageTopUpCandidates(
          selectedDate,
          filteredWorksResolved,
          candidates,
          targetCandidateCount
        );
        if (topUpCandidates.length > 0) {
          candidates = sortCandidates([...candidates, ...topUpCandidates]);
        }
      }
    }
    let assignedCategory3Visits = 0;
    let assignedNonCategory3Visits = 0;

    for (const candidate of candidates) {
      const category3Candidate = isCategory3Work(candidate.work);
      const manualInspectorId = options.manualInspectorByWorkId?.[candidate.work.id];
      const manualInspector = manualInspectorId
        ? activeInspectors.find((inspector) => inspector.id === manualInspectorId)
        : undefined;
      if (
        ENFORCE_CATEGORY3_ASSIGNMENT_SHARE &&
        category3Candidate &&
        !canAssignCategory3Visit(assignedCategory3Visits, assignedNonCategory3Visits)
      ) {
        unassigned.push(createUnassignedVisit(candidate, options.date));
        continue;
      }

      const preferredInspectorId = preferredInspectorByWorkId[candidate.work.id];
      const pools = buildInspectorPools(candidate, activeInspectors);
      const assignmentOrder: Array<{ pool: Inspector[]; allowOverflow: boolean }> = [
        ...(manualInspector ? [{ pool: [manualInspector], allowOverflow: true }] : []),
        { pool: pools.primary, allowOverflow: false },
        { pool: pools.primary, allowOverflow: true },
        { pool: pools.backup, allowOverflow: false },
        { pool: pools.backup, allowOverflow: true },
        { pool: pools.reserve, allowOverflow: false },
        { pool: pools.reserve, allowOverflow: true },
      ];
      const emergencyOrder: Array<{ pool: Inspector[]; allowOverflow: boolean }> = [
        { pool: pools.emergency, allowOverflow: false },
        { pool: pools.emergency, allowOverflow: true },
      ];

      let pick: InspectorPick | null = null;
      for (const option of assignmentOrder) {
        if (option.pool.length === 0) {
          continue;
        }

        pick = pickInspector(
          candidate,
          option.pool,
          loads,
          capacityProfileByInspectorId,
          centroids,
          routeStateByInspector,
          assignedPostcodesByInspector,
          weeklyAssignedVisitsByInspector,
          weeklyFairnessWeight,
          manualInspectorId ?? preferredInspectorId,
          option.allowOverflow
        );
        if (pick) {
          break;
        }
      }

      // Noodpad: enkel verplicht bezoek en enkel als geen expliciete reservepool is geconfigureerd.
      if (!pick && candidate.mandatory) {
        for (const option of emergencyOrder) {
          if (option.pool.length === 0) {
            continue;
          }

          pick = pickInspector(
            candidate,
            option.pool,
            loads,
            capacityProfileByInspectorId,
            centroids,
            routeStateByInspector,
            assignedPostcodesByInspector,
            weeklyAssignedVisitsByInspector,
            weeklyFairnessWeight,
            manualInspectorId ?? preferredInspectorId,
            option.allowOverflow
          );
          if (pick) {
            break;
          }
        }
      }

      if (!pick) {
        unassigned.push(createUnassignedVisit(candidate, options.date));
        continue;
      }

      const currentLoad = loads.get(pick.inspector.id) ?? 0;
      const inspectorCapacity =
        capacityProfileByInspectorId.get(pick.inspector.id) ??
        resolveInspectorCapacityProfile(pick.inspector.id, runtimeCapacity);
      const baseVisitWeight = isComplexWorkForLoad(candidate.work)
        ? runtimeCapacity.complexVisitWeight
        : runtimeCapacity.standardVisitWeight;
      const normalizedExperience = clamp(
        inspectorCapacity.experienceFactor,
        MIN_EXPERIENCE_FACTOR,
        MAX_EXPERIENCE_FACTOR
      );
      const visitLoad = round(
        clamp(baseVisitWeight / normalizedExperience, MIN_VISIT_WEIGHT, MAX_VISIT_WEIGHT),
        2
      );
      const newLoad = currentLoad + visitLoad;
      loads.set(pick.inspector.id, newLoad);
      weeklyAssignedVisitsByInspector.set(
        pick.inspector.id,
        (weeklyAssignedVisitsByInspector.get(pick.inspector.id) ?? 0) + 1
      );
      const workLocation = resolveWorkLocation(candidate.work);
      const routeState = routeStateByInspector.get(pick.inspector.id) ?? {
        latSum: 0,
        lngSum: 0,
        count: 0,
      };
      routeStateByInspector.set(pick.inspector.id, {
        latSum: routeState.latSum + workLocation.lat,
        lngSum: routeState.lngSum + workLocation.lng,
        count: routeState.count + 1,
      });
      const postcodeSet = assignedPostcodesByInspector.get(pick.inspector.id);
      if (postcodeSet) {
        postcodeSet.add(candidate.work.postcode);
      }

      visitsByInspector[pick.inspector.id].push({
        id: `${candidate.work.id}-${options.date}-${candidate.visitType}-${pick.inspector.id}`,
        work: candidate.work,
        visitType: candidate.visitType,
        mandatory: candidate.mandatory,
        priority: candidate.priority,
        inspectorId: pick.inspector.id,
        inspectorInitials: pick.inspector.initials,
        inspectorName: pick.inspector.name || `Toezichter ${pick.inspector.initials}`,
        inspectorAssignmentRole: resolveInspectorAssignmentRole(candidate.work, pick.inspector),
        inspectorColor: pick.inspector.color,
        score: Math.round(pick.score * 10) / 10,
      });
      if (category3Candidate) {
        assignedCategory3Visits += 1;
      } else {
        assignedNonCategory3Visits += 1;
      }
    }
  }

  if (workday && activeInspectors.length > 0) {
    for (const work of filteredWorksResolved) {
      const end = parseIsoDate(work.endDate);
      const adjustedEnd = adjustToWorkday(end, "backward", holidaySet);
      const daysSinceEnd = diffCalendarDays(adjustedEnd, selectedDate);

      if (daysSinceEnd < 7 || daysSinceEnd > 56 || daysSinceEnd % 7 !== 0) {
        continue;
      }

      const inspector = pickInspectorForFollowUp(
        work,
        activeInspectors,
        preferredInspectorByWorkId
      );
      followUpsByInspector[inspector.id].push({
        id: `${work.id}-${options.date}-followup-${inspector.id}`,
        work,
        inspectorId: inspector.id,
        inspectorInitials: inspector.initials,
        inspectorColor: inspector.color,
        reason: "Wekelijkse opleveringsopvolging (mail/telefoon)",
      });
    }
  }

  const plannedVisits = Object.values(visitsByInspector).reduce(
    (sum, visits) => sum + visits.length,
    0
  );
  const mandatoryVisits = Object.values(visitsByInspector)
    .flat()
    .filter((visit) => visit.mandatory).length;
  const optionalVisits = plannedVisits - mandatoryVisits;
  const overflowInspectors = activeInspectors.filter(
    (inspector) => {
      const profile =
        capacityProfileByInspectorId.get(inspector.id) ??
        resolveInspectorCapacityProfile(inspector.id, runtimeCapacity);
      return (loads.get(inspector.id) ?? 0) > profile.softDailyLimit;
    }
  ).length;
  const followUps = Object.values(followUpsByInspector).reduce(
    (sum, tasks) => sum + tasks.length,
    0
  );

  return {
    date: formatIsoDate(selectedDate),
    isWorkday: workday,
    visitsByInspector,
    followUpsByInspector,
    preferredInspectorByWorkId,
    unassigned,
    totals: {
      plannedVisits,
      mandatoryVisits,
      optionalVisits,
      overflowInspectors,
      followUps,
    },
  };
}

export function getNextWorkday(fromDate: string, holidays: string[]): string {
  const holidaySet = new Set(holidays);
  let cursor = parseIsoDate(fromDate);
  while (!isWorkday(cursor, holidaySet)) {
    cursor = addDays(cursor, 1);
  }
  return formatIsoDate(cursor);
}
