import type { WorkRecord } from "../../types";

export type IntegrationMode = "mock" | "api";

export interface WorksQuery {
  dataUrl: string;
  cacheBust?: boolean;
}

export interface WorksGateway {
  readonly name: string;
  readonly mode: IntegrationMode;
  fetchWorks(query: WorksQuery): Promise<WorkRecord[]>;
}

export interface InspectionSyncCommand {
  endpoint: string;
  timeoutMs: number;
  itemId: string;
  itemType: string;
  inspectionId: string;
  idempotencyKey: string;
  mutationVersion: string;
  createdAt: string;
  payload: Record<string, unknown>;
  deviceId: string;
  attempts: number;
}

export type InspectionSyncOutcome = "accepted" | "duplicate" | "rejected";

export interface InspectionSyncAck {
  outcome: InspectionSyncOutcome;
  inspectionId?: string;
  idempotencyKey?: string;
  syncEventId?: string;
  processedAt?: string;
  serverVersion?: string;
  mappedStatus?: "planned" | "in_progress" | "temporary_restore" | "closed";
  statusMappingSource?: string;
}

export interface InspectionSyncResult {
  ok: boolean;
  statusCode: number;
  error?: string;
  ack?: InspectionSyncAck;
  duplicate?: boolean;
}

export interface InspectionsGateway {
  readonly name: string;
  readonly mode: IntegrationMode;
  syncInspection(command: InspectionSyncCommand): Promise<InspectionSyncResult>;
}

export type PermitStatus = "UNKNOWN" | "VALID" | "EXPIRED" | "BLOCKED";

export interface PermitLookupResult {
  permitReference: string;
  status: PermitStatus;
  source: IntegrationMode;
  updatedAt: string;
  notes?: string;
}

export interface PermitsGateway {
  readonly name: string;
  readonly mode: IntegrationMode;
  getPermitStatus(permitReference: string): Promise<PermitLookupResult | null>;
}

export interface ComplaintSummary {
  workId: string;
  openCount: number;
  closedCount: number;
  lastUpdatedAt: string | null;
}

export interface ComplaintsGateway {
  readonly name: string;
  readonly mode: IntegrationMode;
  getComplaintSummary(workId: string): Promise<ComplaintSummary>;
}
