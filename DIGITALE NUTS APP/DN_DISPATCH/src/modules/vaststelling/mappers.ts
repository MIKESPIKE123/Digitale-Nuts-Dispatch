import type { PlannedVisit } from "../../types";
import type {
  ActiveInspectorSession,
  DNVaststellingImmutableContext,
  DNVaststellingRecord,
  DNVaststellingStartPayload,
} from "./contracts";

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `dnv-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function mapVisitToDNVaststellingContext(
  visit: PlannedVisit,
  dispatchDate: string
): DNVaststellingImmutableContext {
  return {
    workId: visit.work.id,
    dossierId: visit.work.dossierId,
    bonuNummer: visit.work.bonuNummer,
    referentieId: visit.work.referentieId,
    gipodId: visit.work.gipodId,
    straat: visit.work.straat,
    huisnr: visit.work.huisnr,
    postcode: visit.work.postcode,
    district: visit.work.district,
    nutsBedrijf: visit.work.nutsBedrijf,
    locationSource: visit.work.locationSource,
    latitude: visit.work.location.lat,
    longitude: visit.work.location.lng,
    plannedVisitDate: dispatchDate,
    visitType: visit.visitType,
    assignedInspectorId: visit.inspectorId,
    assignedInspectorName: visit.inspectorName,
  };
}

export function buildImmutableFingerprint(context: DNVaststellingImmutableContext): string {
  return [
    context.workId,
    context.dossierId,
    context.bonuNummer,
    context.referentieId,
    context.gipodId,
    context.straat,
    context.huisnr,
    context.postcode,
    context.district,
    context.nutsBedrijf,
    context.latitude.toFixed(6),
    context.longitude.toFixed(6),
    context.plannedVisitDate,
    context.visitType,
    context.assignedInspectorId,
  ].join("|");
}

export function createDNVaststellingDraft(
  payload: DNVaststellingStartPayload
): DNVaststellingRecord {
  const now = new Date().toISOString();
  return {
    id: createId(),
    createdAt: now,
    updatedAt: now,
    completionState: "draft",
    inspectorSession: payload.session,
    immutableContext: payload.context,
    mutablePayload: {},
    immutableFingerprint: buildImmutableFingerprint(payload.context),
  };
}

export function buildInspectorSession(
  inspector: { id: string; name?: string; initials: string },
  deviceId: string
): ActiveInspectorSession {
  return {
    inspectorId: inspector.id,
    inspectorName: inspector.name || `Toezichter ${inspector.initials}`,
    inspectorInitials: inspector.initials,
    deviceId,
    startedAt: new Date().toISOString(),
    pinValidated: false,
  };
}
