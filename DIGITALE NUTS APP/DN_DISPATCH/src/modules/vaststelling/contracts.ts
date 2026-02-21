export type DNVaststellingCompletionState = "draft" | "valid" | "queued" | "synced";

export interface ActiveInspectorSession {
  inspectorId: string;
  inspectorName: string;
  inspectorInitials: string;
  deviceId: string;
  startedAt: string;
  pinValidated?: boolean;
}

export interface DNVaststellingImmutableContext {
  workId: string;
  dossierId: string;
  bonuNummer: string;
  referentieId: string;
  gipodId: string;
  straat: string;
  huisnr: string;
  postcode: string;
  district: string;
  nutsBedrijf: string;
  locationSource: "exact" | "postcode";
  latitude: number;
  longitude: number;
  plannedVisitDate: string;
  visitType: "START" | "EIND" | "TUSSEN";
  assignedInspectorId: string;
  assignedInspectorName: string;
}

export type DNVaststellingFieldValue = string | string[];

export type DNVaststellingPhotoFieldKey = "fotoVoor_url" | "fotoDetail_url" | "fotoNa_url";

export interface DNVaststellingChecklistScore {
  score: number;
  okCount: number;
  nokCount: number;
  infoCount: number;
  missingChecks: number;
  responsibleMissing: number;
  measuredItems: number;
  calculatedAt: string;
}

export interface DNVaststellingPhotoEvidence {
  fieldKey: DNVaststellingPhotoFieldKey;
  url: string;
  photoId: string;
  takenAt: string;
  lat: number;
  lon: number;
  actorId: string;
  actorName: string;
  hash: string;
  source: "mock" | "api";
}

export interface DNVaststellingMutablePayload {
  formData?: Record<string, DNVaststellingFieldValue | undefined>;
  metaLocation?: string;
  gps?: string;
  handoverDecision?: "BLOCK" | "REQUEST_FIX" | "APPROVE";
  handoverDecisionNote?: string;
  nokCount?: number;
  checklistScore?: number;
  checklistScoreDetails?: DNVaststellingChecklistScore;
  notes?: string;
  photoEvidence?: DNVaststellingPhotoEvidence[];
  [key: string]: unknown;
}

export interface DNVaststellingRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  completionState: DNVaststellingCompletionState;
  inspectorSession: ActiveInspectorSession;
  immutableContext: DNVaststellingImmutableContext;
  mutablePayload: DNVaststellingMutablePayload;
  immutableFingerprint: string;
}

export interface DNVaststellingStartPayload {
  session: ActiveInspectorSession;
  context: DNVaststellingImmutableContext;
}

export type DNVaststellingSyncStatus = "queued" | "synced" | "failed";

export interface DNVaststellingSyncItem {
  id: string;
  type: "inspection_saved" | "handover_decision" | "field_photos_added";
  status: DNVaststellingSyncStatus;
  createdAt: string;
  payload: Record<string, unknown>;
  attempts: number;
  lastAttemptAt?: string;
  syncedAt?: string;
  lastError?: string;
  responseCode?: number;
  serverOutcome?: "accepted" | "duplicate" | "rejected";
  serverSyncEventId?: string;
  serverProcessedAt?: string;
  serverMappedStatus?: "planned" | "in_progress" | "temporary_restore" | "closed";
  serverStatusMappingSource?: string;
}

export interface DNVaststellingSyncSettings {
  endpoint: string;
  autoSyncOnOnline: boolean;
  requestTimeoutMs: number;
}

export type DNVaststellingValidationCode =
  | "required_field_missing"
  | "nok_responsible_missing"
  | "meta_missing";

export interface DNVaststellingValidationIssue {
  code: DNVaststellingValidationCode;
  sectionId?: string;
  sectionTitle?: string;
  fieldKey?: string;
  fieldLabel?: string;
  inputKey: string;
  message: string;
}

export interface DNVaststellingValidationResult {
  isValid: boolean;
  issues: DNVaststellingValidationIssue[];
  requiredFieldIssues: number;
  nokResponsibleIssues: number;
  metaIssues: number;
}
