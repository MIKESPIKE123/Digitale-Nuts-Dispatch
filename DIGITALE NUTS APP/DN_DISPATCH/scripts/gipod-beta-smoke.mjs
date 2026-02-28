const DEFAULT_BASE_URL = "https://gipod.api.beta-vlaanderen.be";
const DEFAULT_ENDPOINT_V1 = "/api/v1/public-domain-occupancies";
const DEFAULT_ENDPOINT_V2 = "/api/v2/public-domain-occupancies";
const DEFAULT_API_VERSION_MODE = "auto";
const API_VERSION_MODES = new Set(["auto", "v1", "v2"]);
const V1_SUNSET_DATES = ["2026-02-28", "2026-08-31"];
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_LIMIT = 10;
const DEFAULT_OFFSET = 0;
const NIS_CODE_REGEX = /^\d{5}$/;

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(`${value ?? ""}`.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }
  return parsed;
}

function parseNisCodes(value) {
  const raw = normalizeText(value);
  if (!raw) {
    return [];
  }

  const split = raw.split(/[,\s;]+/g).map((item) => item.trim()).filter(Boolean);
  const unique = [...new Set(split)];
  const valid = unique.filter((code) => NIS_CODE_REGEX.test(code));
  const invalid = unique.filter((code) => !NIS_CODE_REGEX.test(code));

  return { valid, invalid };
}

function parseApiVersionMode(value) {
  const normalized = normalizeText(value).toLowerCase();
  if (!normalized) {
    return DEFAULT_API_VERSION_MODE;
  }

  if (API_VERSION_MODES.has(normalized)) {
    return normalized;
  }

  throw new Error(
    `Ongeldige GIPOD_API_VERSION '${value}'. Gebruik auto, v1 of v2.`
  );
}

function resolveEndpointCandidates(endpointOverride, apiVersionMode) {
  if (endpointOverride) {
    return [endpointOverride];
  }

  if (apiVersionMode === "v1") {
    return [DEFAULT_ENDPOINT_V1];
  }

  if (apiVersionMode === "v2") {
    return [DEFAULT_ENDPOINT_V2];
  }

  return [DEFAULT_ENDPOINT_V2, DEFAULT_ENDPOINT_V1];
}

function isFallbackCandidate(statusCode) {
  return statusCode === 404 || statusCode === 410;
}

function isSunsetDateOrLater(todayIso) {
  return V1_SUNSET_DATES.some((sunsetIso) => todayIso >= sunsetIso);
}

function buildUrl({
  baseUrl,
  endpointPath,
  nisCodes,
  limit,
  offset,
  lastModifiedStart,
  lastModifiedEnd,
}) {
  const url = new URL(endpointPath, baseUrl);

  for (const code of nisCodes) {
    url.searchParams.append("niscode", code);
  }

  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));

  if (lastModifiedStart) {
    url.searchParams.set("lastmodified.start", lastModifiedStart);
  }

  if (lastModifiedEnd) {
    url.searchParams.set("lastmodified.end", lastModifiedEnd);
  }

  return url;
}

function mapMemberSummary(item) {
  const status = item?.status?.prefLabel ?? "-";
  const owner = item?.owner?.preferredName ?? "-";
  const periodStart = item?.period?.start ?? "-";
  const periodEnd = item?.period?.end ?? "-";

  return {
    gipodId: item?.gipodId ?? "-",
    reference: item?.reference ?? "-",
    status,
    owner,
    periodStart,
    periodEnd,
    lastModifiedOn: item?.lastModifiedOn ?? "-",
  };
}

async function fetchWithTimeout(url, token, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function main() {
  const token =
    normalizeText(process.env.GIPOD_BEARER_TOKEN) || normalizeText(process.env.GIPOD_TOKEN);
  if (!token) {
    throw new Error(
      "Geen token gevonden. Zet GIPOD_BEARER_TOKEN in je environment en probeer opnieuw."
    );
  }

  const baseUrl = normalizeText(process.env.GIPOD_BASE_URL) || DEFAULT_BASE_URL;
  const endpointOverride = normalizeText(process.env.GIPOD_ENDPOINT_PATH);
  const apiVersionMode = parseApiVersionMode(process.env.GIPOD_API_VERSION);
  const timeoutMs = parsePositiveInt(process.env.GIPOD_TIMEOUT_MS, DEFAULT_TIMEOUT_MS);
  const limit = parsePositiveInt(process.env.GIPOD_LIMIT, DEFAULT_LIMIT);
  const offset = parsePositiveInt(process.env.GIPOD_OFFSET, DEFAULT_OFFSET);
  const lastModifiedStart = normalizeText(process.env.GIPOD_LASTMODIFIED_START);
  const lastModifiedEnd = normalizeText(process.env.GIPOD_LASTMODIFIED_END);
  const endpointCandidates = resolveEndpointCandidates(endpointOverride, apiVersionMode);

  const parsedNis = parseNisCodes(process.env.GIPOD_NIS_CODES || process.env.GIPOD_NISCODE);
  const nisCodes = parsedNis.valid;
  if (nisCodes.length === 0) {
    throw new Error(
      "Geen geldige NIS-codes gevonden. Zet GIPOD_NIS_CODES met 5-cijferige codes, bv. 11002."
    );
  }

  if (parsedNis.invalid.length > 0) {
    console.warn(
      `[gipod-smoke] Ongeldige NIS-codes genegeerd: ${parsedNis.invalid.join(", ")}`
    );
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (!endpointOverride && endpointCandidates.includes(DEFAULT_ENDPOINT_V1) && isSunsetDateOrLater(todayIso)) {
    console.warn(
      `[gipod-smoke] Let op: v1 endpoint mogelijk sunset-risico op ${todayIso}. ` +
        "Gebruik bij voorkeur GIPOD_API_VERSION=v2 of zet expliciet GIPOD_ENDPOINT_PATH."
    );
  }

  let usedUrl = null;
  let usedEndpointPath = null;
  let rawBody = "";
  let response = null;

  for (let index = 0; index < endpointCandidates.length; index += 1) {
    const endpointPath = endpointCandidates[index];
    const candidateUrl = buildUrl({
      baseUrl,
      endpointPath,
      nisCodes,
      limit,
      offset,
      lastModifiedStart,
      lastModifiedEnd,
    });

    try {
      const candidateResponse = await fetchWithTimeout(candidateUrl, token, timeoutMs);
      const candidateRawBody = await candidateResponse.text();

      if (candidateResponse.ok) {
        usedUrl = candidateUrl;
        usedEndpointPath = endpointPath;
        response = candidateResponse;
        rawBody = candidateRawBody;
        break;
      }

      const canFallback =
        !endpointOverride &&
        apiVersionMode === "auto" &&
        index < endpointCandidates.length - 1 &&
        isFallbackCandidate(candidateResponse.status);

      if (canFallback) {
        console.warn(
          `[gipod-smoke] Endpoint ${endpointPath} gaf ${candidateResponse.status}. ` +
            `Fallback naar ${endpointCandidates[index + 1]}.`
        );
        continue;
      }

      const preview = candidateRawBody.slice(0, 350).replace(/\s+/g, " ").trim();
      throw new Error(
        `GIPOD antwoordde met ${candidateResponse.status} ${candidateResponse.statusText} op ${endpointPath}. Body: ${preview || "-"}`
      );
    } catch (error) {
      const canRetryWithFallback =
        !endpointOverride && apiVersionMode === "auto" && index < endpointCandidates.length - 1;

      if (canRetryWithFallback) {
        const message = error instanceof Error ? error.message : "Onbekende fout";
        console.warn(
          `[gipod-smoke] Fout op ${endpointPath}: ${message}. Fallback naar ${endpointCandidates[index + 1]}.`
        );
        continue;
      }

      const message = error instanceof Error ? error.message : "Onbekende netwerkfout";
      throw new Error(`Netwerkfout tijdens GIPOD smoke test: ${message}`);
    }
  }

  if (!response || !usedUrl || !usedEndpointPath) {
    throw new Error("Geen bruikbaar endpoint gevonden voor de smoke test.");
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    throw new Error("GIPOD response is geen geldige JSON.");
  }

  const members = Array.isArray(payload?.member) ? payload.member : [];
  const totalItems = Number.isFinite(Number(payload?.totalItems)) ? Number(payload.totalItems) : null;
  const nextPage = payload?.view?.next ?? null;

  console.log("[gipod-smoke] OK");
  console.log(`[gipod-smoke] Endpoint mode: ${endpointOverride ? "custom" : apiVersionMode}`);
  console.log(`[gipod-smoke] Endpoint gebruikt: ${usedUrl.origin}${usedUrl.pathname}`);
  if (usedEndpointPath === DEFAULT_ENDPOINT_V1) {
    console.log("[gipod-smoke] Endpoint versie: v1");
  } else if (usedEndpointPath === DEFAULT_ENDPOINT_V2) {
    console.log("[gipod-smoke] Endpoint versie: v2");
  } else {
    console.log(`[gipod-smoke] Endpoint pad: ${usedEndpointPath}`);
  }
  console.log(`[gipod-smoke] Filters: niscode=${nisCodes.join(",")} limit=${limit} offset=${offset}`);
  if (lastModifiedStart || lastModifiedEnd) {
    console.log(
      `[gipod-smoke] lastmodified: ${lastModifiedStart || "-"} .. ${lastModifiedEnd || "-"}`
    );
  }
  console.log(
    `[gipod-smoke] Resultaat: ${members.length} items` +
      (totalItems !== null ? ` (totalItems=${totalItems})` : "")
  );
  console.log(`[gipod-smoke] Volgende pagina: ${nextPage ? "ja" : "nee"}`);

  const sample = members.slice(0, 5).map(mapMemberSummary);
  if (sample.length === 0) {
    console.log("[gipod-smoke] Geen items in huidige pagina.");
    return;
  }

  console.log("[gipod-smoke] Voorbeeldrecords (max 5):");
  console.table(sample);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Onbekende fout";
  console.error(`[gipod-smoke] FAIL: ${message}`);
  process.exitCode = 1;
});
