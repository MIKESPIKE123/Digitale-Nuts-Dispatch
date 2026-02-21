import type {
  DNVaststellingChecklistScore,
  DNVaststellingFieldValue,
} from "./contracts";

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function isNok(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return normalized.startsWith("NOK") || normalized.startsWith("NOT OK");
}

function isOk(value: string): boolean {
  const normalized = value.trim().toUpperCase();
  return normalized.startsWith("OK");
}

function getEntries(value: DNVaststellingFieldValue | undefined): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.filter((item) => item.trim().length > 0);
  }
  return [];
}

function isRequiredCheckMissing(
  formData: Record<string, DNVaststellingFieldValue>,
  key: string
): boolean {
  const value = formData[key];
  if (typeof value === "string") {
    return value.trim().length === 0;
  }
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  return true;
}

export function calculateChecklistScore(
  formData: Record<string, DNVaststellingFieldValue>,
  calculatedAt = new Date().toISOString()
): DNVaststellingChecklistScore {
  let okCount = 0;
  let nokCount = 0;
  let infoCount = 0;
  let responsibleMissing = 0;
  let missingChecks = 0;

  for (const [key, rawValue] of Object.entries(formData)) {
    if (key.includes("__responsible")) {
      continue;
    }

    const entries = getEntries(rawValue);
    for (const entry of entries) {
      if (isNok(entry)) {
        nokCount += 1;
        const specificResponsibleKey = `${key}__responsible__${entry}`;
        const genericResponsibleKey = `${key}__responsible`;
        if (!hasText(formData[specificResponsibleKey]) && !hasText(formData[genericResponsibleKey])) {
          responsibleMissing += 1;
        }
        continue;
      }
      if (isOk(entry)) {
        okCount += 1;
      } else {
        infoCount += 1;
      }
    }
  }

  const requiredBaseChecks = [
    "district",
    "ingreepType",
    "fase",
    "verhardingType",
    "status",
  ];
  for (const key of requiredBaseChecks) {
    if (isRequiredCheckMissing(formData, key)) {
      missingChecks += 1;
    }
  }

  const faseValue = typeof formData.fase === "string" ? formData.fase : "";
  const statusValue = typeof formData.status === "string" ? formData.status : "";
  const verhardingType = typeof formData.verhardingType === "string" ? formData.verhardingType : "";

  if (faseValue === "tijdelijk_herstel" && isRequiredCheckMissing(formData, "termijnHerstel")) {
    missingChecks += 1;
  }

  if (verhardingType === "natuursteen" && isRequiredCheckMissing(formData, "kritiekeZone")) {
    missingChecks += 1;
  }

  if (statusValue === "afgesloten" || faseValue === "definitief_herstel") {
    if (isRequiredCheckMissing(formData, "fotoVoor_url")) {
      missingChecks += 1;
    }
    if (isRequiredCheckMissing(formData, "fotoDetail_url")) {
      missingChecks += 1;
    }
    if (isRequiredCheckMissing(formData, "fotoNa_url")) {
      missingChecks += 1;
    }
  }

  // Weighted model for a stable 0-100 quality score.
  let score = 100;
  score -= nokCount * 15;
  score -= missingChecks * 12;
  score -= responsibleMissing * 8;
  score += Math.min(okCount, 20) * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    okCount,
    nokCount,
    infoCount,
    missingChecks,
    responsibleMissing,
    measuredItems: okCount + nokCount + infoCount,
    calculatedAt,
  };
}
