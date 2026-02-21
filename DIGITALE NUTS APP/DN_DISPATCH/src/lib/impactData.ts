import impactFallbackRaw from "../data/impact.generated.json";
import type { ImpactDataFile, ImpactProfile } from "./impactScoring";

const FALLBACK = impactFallbackRaw as ImpactDataFile;

function normalizePostcode(value: string | null | undefined): string {
  return `${value ?? ""}`.trim();
}

function isImpactProfile(candidate: unknown): candidate is ImpactProfile {
  if (!candidate || typeof candidate !== "object") {
    return false;
  }

  const profile = candidate as Partial<ImpactProfile>;
  return (
    typeof profile.areaId === "string" &&
    typeof profile.areaLabel === "string" &&
    profile.indicators !== null &&
    typeof profile.indicators === "object"
  );
}

export function buildImpactProfileMap(data: unknown): Record<string, ImpactProfile> {
  if (!data || typeof data !== "object") {
    return {};
  }

  const payload = data as Partial<ImpactDataFile>;
  if (!Array.isArray(payload.profiles)) {
    return {};
  }

  const map: Record<string, ImpactProfile> = {};
  for (const profile of payload.profiles) {
    if (!isImpactProfile(profile)) {
      continue;
    }
    const key = normalizePostcode(profile.areaId);
    if (!key) {
      continue;
    }
    map[key] = profile;
  }

  return map;
}

export function getFallbackImpactProfileMap(): Record<string, ImpactProfile> {
  return buildImpactProfileMap(FALLBACK);
}

export async function fetchImpactProfileMap(url: string): Promise<Record<string, ImpactProfile>> {
  const response = await fetch(`${url}?_=${Date.now()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Impact databron niet bereikbaar (${response.status}).`);
  }

  const parsed = await response.json();
  const map = buildImpactProfileMap(parsed);
  if (Object.keys(map).length === 0) {
    throw new Error("Impact databron bevat geen bruikbare profielen.");
  }
  return map;
}
