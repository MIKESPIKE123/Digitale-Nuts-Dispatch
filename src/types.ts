export type WorkStatus = "VERGUND" | "IN EFFECT";
export type InspectorAssignmentRole = "DEDICATED" | "BACKUP" | "RESERVE";

export type GIPODPermitStatus =
  | "AFGELEVERD"
  | "IN_VOORBEREIDING"
  | "NIET_VEREIST"
  | "ONBEKEND"
  | "ONBEKEND_MAAR_VERWACHT"
  | "GEWEIGERD_OF_STOPGEZET";

export interface WorkRecord {
  id: string;
  dossierId: string;
  bonuNummer: string;
  referentieId: string;
  gipodId: string;
  gipodReferentie?: string;
  werftype: string;
  status: WorkStatus;
  sourceStatus?: string;
  startDate: string;
  endDate: string;
  postcode: string;
  district: string;
  straat: string;
  huisnr: string;
  nutsBedrijf: string;
  durationDays: number;
  location: {
    lat: number;
    lng: number;
  };
  locationSource: "exact" | "postcode";
  gipodSoort?: string;
  gipodType?: string;
  gipodCategorie?: string;
  vgwUitgestuurd?: "ja" | "nee" | "onbekend";
  permitStatus?: GIPODPermitStatus;
  permitStatusSource?: string;
  permitJoinConfidence?: "high" | "medium" | "low";
  permitReferenceId?: string;
  permitRefKey?: string;
  permitBonuNummer?: string;
  permitDossierStatus?: string;
  sourceDataset?: "gipod_export" | "weekrapport_fallback";
}

export interface Inspector {
  id: string;
  initials: string;
  name?: string;
  color: string;
  primaryPostcodes: string[];
  backupPostcodes: string[];
  isReserve?: boolean;
  activeFrom?: string;
  activeUntil?: string;
}

export interface InspectorOverride {
  initials?: string;
  name?: string;
  primaryPostcodes?: string[];
  backupPostcodes?: string[];
  isReserve?: boolean;
  activeFrom?: string;
  activeUntil?: string;
}

export interface InspectorAbsenceRange {
  startDate: string;
  endDate: string;
}

export interface InspectorCapacityOverride {
  softDailyLimit?: number;
  hardDailyLimit?: number;
  fixedDailyLoad?: number;
  experienceFactor?: number;
}

export interface DispatchCapacitySettings {
  softDailyLimit: number;
  hardDailyLimit: number;
  standardVisitWeight: number;
  complexVisitWeight: number;
  inspectorOverrides: Record<string, InspectorCapacityOverride>;
}

export interface DispatchSettings {
  holidays: string[];
  customInspectors: Inspector[];
  inspectorOverrides: Record<string, InspectorOverride>;
  inspectorAbsences: Record<string, InspectorAbsenceRange[]>;
  dispatchCapacity: DispatchCapacitySettings;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
}

export type VisitType = "START" | "EIND" | "TUSSEN";

export interface PlannedVisit {
  id: string;
  work: WorkRecord;
  visitType: VisitType;
  mandatory: boolean;
  priority: number;
  inspectorId: string;
  inspectorInitials: string;
  inspectorName: string;
  inspectorAssignmentRole?: InspectorAssignmentRole;
  inspectorColor: string;
  score: number;
}

export interface FollowUpTask {
  id: string;
  work: WorkRecord;
  inspectorId: string;
  inspectorInitials: string;
  inspectorColor: string;
  reason: string;
}

export interface DispatchPlan {
  date: string;
  isWorkday: boolean;
  visitsByInspector: Record<string, PlannedVisit[]>;
  followUpsByInspector: Record<string, FollowUpTask[]>;
  preferredInspectorByWorkId: Record<string, string>;
  unassigned: PlannedVisit[];
  totals: {
    plannedVisits: number;
    mandatoryVisits: number;
    optionalVisits: number;
    overflowInspectors: number;
    followUps: number;
  };
}

// Roadmap Iteratie 1: Tijdlijn (Gantt), Afhankelijkheden en Capaciteit per week.
export type PlanningPhase = "VERGUND" | "IN_EFFECT" | "OPLEVERING" | "AFGEROND";

export type MilestoneType =
  | "PERMIT_AANGEVRAAGD"
  | "PERMIT_GOEDGEKEURD"
  | "STARTBEZOEK"
  | "IN_EFFECT_START"
  | "EINDBEZOEK"
  | "OPLEVERING_VERWACHT"
  | "OPLEVERING_AFGESLOTEN";

export type DependencyType = "FS" | "SS" | "FF" | "SF";

export type DependencyStatus = "OK" | "RISICO" | "GEBLOKKEERD";

export interface PlanningMilestone {
  id: string;
  workId: string;
  type: MilestoneType;
  date: string;
  done: boolean;
  source: "SYSTEM" | "MANUEEL" | "EXTERN_API";
}

export interface PlanningRecord {
  id: string;
  workId: string;
  dossierId: string;
  phase: PlanningPhase;
  baselineStart: string | null;
  baselineEnd: string | null;
  planStart: string;
  planEnd: string;
  actualStart: string | null;
  actualEnd: string | null;
  expectedDurationDays: number;
  remainingDays: number | null;
  progressPct: number | null;
  complexityScore: number | null;
  riskScore: number | null;
  slaDeadline: string | null;
  permitDeadline: string | null;
  lastVisitDate: string | null;
  nextVisitDueDate: string | null;
  preferredInspectorId: string | null;
  assignedInspectorId: string | null;
  reassignmentCount: number;
  blockedByWorkIds: string[];
  criticalPath: boolean;
  slackDays: number | null;
}

export interface DependencyRecord {
  id: string;
  predecessorWorkId: string;
  successorWorkId: string;
  type: DependencyType;
  lagDays: number;
  status: DependencyStatus;
  reason: string;
  lastEvaluatedAt: string;
}

export interface InspectorAvailability {
  inspectorId: string;
  weekIso: string;
  availableWorkdays: number;
  absenceDates: string[];
  holidayDates: string[];
  capacityPerDay: number;
  overflowPerDay: number;
}

export interface WeeklyCapacityRecord {
  id: string;
  inspectorId: string;
  weekIso: string;
  plannedVisits: number;
  plannedFollowUps: number;
  unassignedVisits: number;
  travelMinutes: number;
  availableWorkdays: number;
  maxWeeklyCapacity: number;
  utilizationPct: number;
  overflowVisits: number;
  loadStatus: "OK" | "HOOG" | "OVERBELAST";
}

export interface TimelineViewModel {
  dateRangeStart: string;
  dateRangeEnd: string;
  planningRecords: PlanningRecord[];
  milestones: PlanningMilestone[];
  dependencies: DependencyRecord[];
}

export interface CapacityViewModel {
  weekIso: string;
  records: WeeklyCapacityRecord[];
  totals: {
    totalPlannedVisits: number;
    totalUnassignedVisits: number;
    totalOverflowVisits: number;
    averageUtilizationPct: number;
  };
}
