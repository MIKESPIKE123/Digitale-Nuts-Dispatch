import type { GIPODPermitStatus, WorkRecord, WorkStatus } from "../types";
import { isPermitExpiredViolationWork } from "./workStatusFlags";

export const UNKNOWN_GIPOD_CATEGORY = "Onbekend";
export const UNKNOWN_PERMIT_STATUS: GIPODPermitStatus = "ONBEKEND";
export const BASE_OPERATIONAL_STATUSES: WorkStatus[] = ["VERGUND", "IN EFFECT"];
export const WORK_STATUS_FILTER_VALUES: WorkStatus[] = [
  ...BASE_OPERATIONAL_STATUSES,
  "VERGUNNING VERLOPEN",
];

export type WorkFilterOptions = {
  statuses: WorkStatus[];
  sourceStatuses?: string[];
  gipodCategories?: string[];
  permitStatuses?: GIPODPermitStatus[];
  districts?: string[];
  postcodes?: string[];
  requireAsignPermit?: boolean;
  excludePermitExpiredViolations?: boolean;
};

export type WorkExclusionReason =
  | "missing_asign_permit"
  | "permit_expired_violation"
  | "status"
  | "source_status"
  | "gipod_category"
  | "permit_status"
  | "district"
  | "postcode";

export function buildOperationalWorkFilterOptions(
  overrides: Partial<WorkFilterOptions> & Pick<WorkFilterOptions, "statuses">
): WorkFilterOptions {
  return {
    statuses: overrides.statuses,
    sourceStatuses: overrides.sourceStatuses ?? [],
    gipodCategories: overrides.gipodCategories ?? [],
    permitStatuses: overrides.permitStatuses ?? [],
    districts: overrides.districts ?? [],
    postcodes: overrides.postcodes ?? [],
    requireAsignPermit: overrides.requireAsignPermit ?? false,
    excludePermitExpiredViolations: overrides.excludePermitExpiredViolations ?? false,
  };
}

export function hasASignPermitReference(
  work: Pick<WorkRecord, "permitRefKey" | "permitReferenceId">
): boolean {
  return Boolean((work.permitRefKey ?? "").trim() || (work.permitReferenceId ?? "").trim());
}

export function getWorkExclusionReasons(
  work: WorkRecord,
  options: WorkFilterOptions
): WorkExclusionReason[] {
  const reasons: WorkExclusionReason[] = [];
  const statusFilter = new Set(options.statuses);
  const sourceStatusFilter = new Set(options.sourceStatuses ?? []);
  const categoryFilter = new Set(options.gipodCategories ?? []);
  const permitStatusFilter = new Set(options.permitStatuses ?? []);
  const districtFilter = new Set(options.districts ?? []);
  const postcodeFilter = new Set(options.postcodes ?? []);

  if (options.requireAsignPermit && !hasASignPermitReference(work)) {
    reasons.push("missing_asign_permit");
  }

  if (options.excludePermitExpiredViolations && isPermitExpiredViolationWork(work)) {
    reasons.push("permit_expired_violation");
  }

  if (!statusFilter.has(work.status)) {
    reasons.push("status");
  }

  if (
    sourceStatusFilter.size > 0 &&
    !sourceStatusFilter.has((work.sourceStatus ?? UNKNOWN_GIPOD_CATEGORY).trim())
  ) {
    reasons.push("source_status");
  }

  if (
    categoryFilter.size > 0 &&
    !categoryFilter.has((work.gipodCategorie ?? UNKNOWN_GIPOD_CATEGORY).trim())
  ) {
    reasons.push("gipod_category");
  }

  if (
    permitStatusFilter.size > 0 &&
    !permitStatusFilter.has((work.permitStatus ?? UNKNOWN_PERMIT_STATUS).trim() as GIPODPermitStatus)
  ) {
    reasons.push("permit_status");
  }

  if (districtFilter.size > 0 && !districtFilter.has(work.district)) {
    reasons.push("district");
  }

  if (postcodeFilter.size > 0 && !postcodeFilter.has(work.postcode)) {
    reasons.push("postcode");
  }

  return reasons;
}

export function shouldIncludeWork(work: WorkRecord, options: WorkFilterOptions): boolean {
  return getWorkExclusionReasons(work, options).length === 0;
}

export function filterWorks(works: WorkRecord[], options: WorkFilterOptions): WorkRecord[] {
  return works.filter((work) => shouldIncludeWork(work, options));
}
