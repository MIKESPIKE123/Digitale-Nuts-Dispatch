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
import type {
  DispatchCapacitySettings,
  DispatchPlan,
  FollowUpTask,
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
  permitStatuses?: string[];
  districts: string[];
  postcodes: string[];
  stickyInspectorByWorkId?: Record<string, string>;
  unavailableInspectorIds?: string[];
  dispatchCapacity?: DispatchCapacitySettings;
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
  const globalLoads = new Map<string, number>();
  const validInspectorIds = new Set(inspectors.map((inspector) => inspector.id));

  for (const inspector of inspectors) {
    globalLoads.set(inspector.id, 0);
  }

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
      globalLoads.set(stickyInspectorId, (globalLoads.get(stickyInspectorId) ?? 0) + 1);
      continue;
    }

    let bestInspector: Inspector | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const inspector of inspectors) {
      const load = globalLoads.get(inspector.id) ?? 0;
      const centroid = centroids.get(inspector.id) ?? DEFAULT_CENTER;

      let score = scoreInspectorForWork(work, inspector, centroid, load);
      score -= load * 2;

      if (score > bestScore) {
        bestScore = score;
        bestInspector = inspector;
      }
    }

    if (bestInspector) {
      preferred[work.id] = bestInspector.id;
      globalLoads.set(bestInspector.id, (globalLoads.get(bestInspector.id) ?? 0) + 1);
    }
  }

  return preferred;
}

function buildCandidates(
  selectedDate: Date,
  works: WorkRecord[],
  holidays: Set<string>
): Candidate[] {
  const candidates: Candidate[] = [];

  for (const work of works) {
    const start = parseIsoDate(work.startDate);
    const end = parseIsoDate(work.endDate);

    if (selectedDate < start || selectedDate > end) {
      continue;
    }

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

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    const aEnd = parseIsoDate(a.work.endDate);
    const bEnd = parseIsoDate(b.work.endDate);
    return aEnd.getTime() - bEnd.getTime();
  });

  return candidates;
}

type InspectorPools = {
  primaryOrBackup: Inspector[];
  reserve: Inspector[];
  emergency: Inspector[];
};

function buildInspectorPools(
  candidate: Candidate,
  inspectors: Inspector[]
): InspectorPools {
  const primaryOrBackup = inspectors.filter(
    (inspector) =>
      isPrimaryInspectorForWork(candidate.work, inspector) ||
      isBackupInspectorForWork(candidate.work, inspector)
  );

  if (primaryOrBackup.length === inspectors.length) {
    return {
      primaryOrBackup,
      reserve: [],
      emergency: [],
    };
  }

  const poolIds = new Set(primaryOrBackup.map((inspector) => inspector.id));
  const reserve = inspectors.filter(
    (inspector) => !poolIds.has(inspector.id) && inspector.isReserve === true
  );
  const hasExplicitReserves = inspectors.some((inspector) => inspector.isReserve === true);
  const emergency = hasExplicitReserves
    ? []
    : inspectors.filter((inspector) => !poolIds.has(inspector.id));

  return {
    primaryOrBackup,
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
  preferredInspectorId: string | undefined,
  allowOverflow: boolean
): InspectorPick | null {
  let best: InspectorPick | null = null;

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

    if (best === null || score > best.score) {
      best = { inspector, score };
    }
  }

  return best;
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
  const activeInspectors = options.inspectors.filter(
    (inspector) =>
      !unavailableInspectorIds.has(inspector.id) &&
      isInspectorActiveForDate(inspector, selectedDateIso)
  );

  const statusFilter = new Set(options.statuses);
  const sourceStatusFilter = new Set(options.sourceStatuses ?? []);
  const categoryFilter = new Set(options.gipodCategories ?? []);
  const permitStatusFilter = new Set(options.permitStatuses ?? []);
  const districtFilter = new Set(options.districts);
  const postcodeFilter = new Set(options.postcodes);

  const filteredWorks = options.works.filter((work) => {
    if (!statusFilter.has(work.status)) {
      return false;
    }

    if (
      sourceStatusFilter.size > 0 &&
      !sourceStatusFilter.has((work.sourceStatus ?? "Onbekend").trim())
    ) {
      return false;
    }

    if (
      categoryFilter.size > 0 &&
      !categoryFilter.has((work.gipodCategorie ?? "Onbekend").trim())
    ) {
      return false;
    }

    if (
      permitStatusFilter.size > 0 &&
      !permitStatusFilter.has((work.permitStatus ?? "ONBEKEND").trim())
    ) {
      return false;
    }

    if (districtFilter.size > 0 && !districtFilter.has(work.district)) {
      return false;
    }

    if (postcodeFilter.size > 0 && !postcodeFilter.has(work.postcode)) {
      return false;
    }

    return true;
  });

  const visitsByInspector: Record<string, PlannedVisit[]> = {};
  const followUpsByInspector: Record<string, FollowUpTask[]> = {};
  const loads = new Map<string, number>();
  const capacityProfileByInspectorId = new Map<string, InspectorCapacityProfile>();
  const centroids = new Map<string, { lat: number; lng: number }>();
  const routeStateByInspector = new Map<string, InspectorRoutingState>();
  const assignedPostcodesByInspector = new Map<string, Set<string>>();

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
    }
  }

  const preferredInspectorByWorkId = buildPreferredInspectorMap(
    filteredWorks,
    activeInspectors,
    centroids,
    options.stickyInspectorByWorkId ?? {}
  );

  const unassigned: PlannedVisit[] = [];

  if (workday) {
    const candidates = buildCandidates(selectedDate, filteredWorks, holidaySet);

    for (const candidate of candidates) {
      const preferredInspectorId = preferredInspectorByWorkId[candidate.work.id];
      const pools = buildInspectorPools(candidate, activeInspectors);
      const assignmentOrder: Array<{ pool: Inspector[]; allowOverflow: boolean }> = [
        { pool: pools.primaryOrBackup, allowOverflow: false },
        { pool: pools.reserve, allowOverflow: false },
        { pool: pools.primaryOrBackup, allowOverflow: true },
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
          preferredInspectorId,
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
            preferredInspectorId,
            option.allowOverflow
          );
          if (pick) {
            break;
          }
        }
      }

      if (!pick) {
        unassigned.push({
          id: `${candidate.work.id}-${options.date}-${candidate.visitType}-unassigned`,
          work: candidate.work,
          visitType: candidate.visitType,
          mandatory: candidate.mandatory,
          priority: candidate.priority,
          inspectorId: "UNASSIGNED",
          inspectorInitials: "--",
          inspectorName: "Niet toegewezen",
          inspectorColor: "#6b7280",
          score: -1,
        });
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
    }
  }

  if (workday && activeInspectors.length > 0) {
    for (const work of filteredWorks) {
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
