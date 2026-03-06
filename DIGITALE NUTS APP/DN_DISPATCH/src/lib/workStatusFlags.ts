import type { WorkRecord } from "../types";

function normalizeStatusToken(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function isPermitExpiredDossierStatus(statusRaw?: string): boolean {
  const status = normalizeStatusToken(statusRaw);
  if (!status) {
    return false;
  }

  if (status.includes("vergunning afgelopen")) {
    return true;
  }

  if (status.includes("vergunning verlopen")) {
    return true;
  }

  if (status.includes("permit expired")) {
    return true;
  }

  return status.includes("vergunning") && status.includes("afgelopen");
}

export function isPermitExpiredViolationWork(
  work: Pick<WorkRecord, "sourceStatus" | "permitDossierStatus">
): boolean {
  return (
    isPermitExpiredDossierStatus(work.permitDossierStatus) ||
    isPermitExpiredDossierStatus(work.sourceStatus)
  );
}
