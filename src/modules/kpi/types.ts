import type { ImpactLevel } from "../../lib/impactScoring";
import type { DispatchPlan, Inspector, PlannedVisit, WorkRecord } from "../../types";
import type {
  ActiveInspectorSession,
  DNVaststellingRecord,
  DNVaststellingSyncItem,
} from "../vaststelling/contracts";

export interface KpiCard {
  key: string;
  label: string;
  value: string;
  detail: string;
  definition?: string;
}

export interface PitchKpiEngineInput {
  terrainMode: boolean;
  activeInspectorSession: ActiveInspectorSession | null;
  visibleInspectorIds: Set<string>;
  selectedDate: string;
  contextWorksCount: number;
  mapVisits: PlannedVisit[];
  impactByVisitId: Record<string, { level: ImpactLevel | null; score: number | null }>;
  records: DNVaststellingRecord[];
  syncQueue: DNVaststellingSyncItem[];
}

export interface DashboardKpiEngineInput {
  selectedDate: string;
  contextWorks: WorkRecord[];
  mapVisits: PlannedVisit[];
  dispatch: DispatchPlan;
  inspectors: Inspector[];
  visibleInspectorIds: Set<string>;
  filteredFollowUpCount: number;
}

export type TrendTone = "good" | "bad" | "neutral";

export interface TrendKpiCard {
  key: string;
  label: string;
  currentValue: string;
  previousValue: string;
  deltaValue: string;
  detail: string;
  definition?: string;
  tone: TrendTone;
}

export interface TrendKpiEngineInput {
  terrainMode: boolean;
  activeInspectorSession: ActiveInspectorSession | null;
  visibleInspectorIds: Set<string>;
  selectedDate: string;
  records: DNVaststellingRecord[];
}
