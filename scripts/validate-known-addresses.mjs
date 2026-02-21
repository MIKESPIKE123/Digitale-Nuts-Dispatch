import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "DATA");
const WORKS_FILE = path.join(ROOT, "src", "data", "works.generated.json");
const KNOWN_FILE = path.join(ROOT, "scripts", "known-addresses-regressiecheck.json");
const GEOCODE_CACHE_FILE = path.join(DATA_DIR, "geocode-cache.json");
const REPORT_JSON_FILE = path.join(DATA_DIR, "known_address_validation_report.json");
const REPORT_MD_FILE = path.join(ROOT, "docs", "uitvoering", "DN_KNOWN_ADDRESS_REGRESSIECHECK.md");
const DEFAULT_THRESHOLD_METERS = 120;
const GEOCODE_DELAY_MS = 1100;

function normalize(value) {
  return `${value ?? ""}`.trim();
}

function normalizeHouseNumber(value) {
  const cleaned = normalize(value)
    .replace(/\s+/g, " ")
    .replace(/\b(bus|boite)\b.*$/i, "")
    .trim();

  if (!cleaned) {
    return "";
  }

  const primaryPart = cleaned.split("-")[0]?.trim() ?? cleaned;
  const full = primaryPart.match(/^(\d+)([a-zA-Z]*)/);
  if (full) {
    const digits = full[1];
    const letters = (full[2] ?? "").toUpperCase();
    if (letters.length <= 1) {
      return `${digits}${letters}`;
    }
    return digits;
  }
  const fallback = primaryPart.match(/\d+/);
  return fallback ? fallback[0] : primaryPart;
}

function toAddressKey(entry) {
  return `${normalize(entry.straat)}|${normalizeHouseNumber(entry.huisnr)}|${normalize(entry.postcode)}`.toLowerCase();
}

function toAddressQuery(entry) {
  const house = normalizeHouseNumber(entry.huisnr);
  return `${normalize(entry.straat)} ${house}, ${normalize(entry.postcode)} Antwerpen, Belgium`;
}

function loadJsonFile(filepath, fallback) {
  if (!fs.existsSync(filepath)) {
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJsonFile(filepath, payload) {
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2), "utf8");
}

function readPositiveNumberEnv(name, fallback) {
  const raw = normalize(process.env[name]);
  if (!raw) {
    return fallback;
  }
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(query) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&limit=1&countrycodes=be&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "DN-Dispatch/0.1 (known-address-validator)",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    return null;
  }

  const result = await response.json();
  const first = Array.isArray(result) ? result[0] : null;
  if (!first || first.lat === undefined || first.lon === undefined) {
    return null;
  }

  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lng,
    displayName: normalize(first.display_name),
  };
}

function haversineDistanceMeters(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusM = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * earthRadiusM * Math.asin(Math.sqrt(h));
}

function toMarkdown(report) {
  const lines = [];
  lines.push("# DN Known Address Regressiecheck");
  lines.push("");
  lines.push(`Datum run: ${report.generatedAt}`);
  lines.push(`Threshold (OK): <= ${report.thresholdMeters}m`);
  lines.push("");
  lines.push("## Samenvatting");
  lines.push("");
  lines.push(`1. Totaal referentieadressen: ${report.totalKnown}`);
  lines.push(`2. Gevonden in dataset: ${report.foundInDataset}`);
  lines.push(`3. Geocodes opgehaald in deze run: ${report.geocodedNow}`);
  lines.push(`4. OK (<= threshold): ${report.okCount}`);
  lines.push(`5. Afwijking (> threshold): ${report.deviationCount}`);
  lines.push(`6. Ontbrekend in dataset: ${report.missingCount}`);
  lines.push("");
  lines.push("## Detail");
  lines.push("");
  lines.push("| GIPOD | Adres | Dataset punt | Geocode punt | Afwijking (m) | Status |");
  lines.push("|---|---|---|---|---:|---|");

  for (const item of report.items) {
    const address = `${item.straat} ${item.huisnr}, ${item.postcode} ${item.district}`;
    const datasetPoint =
      item.datasetPoint && Number.isFinite(item.datasetPoint.lat) && Number.isFinite(item.datasetPoint.lng)
        ? `${item.datasetPoint.lat.toFixed(6)}, ${item.datasetPoint.lng.toFixed(6)}`
        : "-";
    const geocodePoint =
      item.geocodePoint && Number.isFinite(item.geocodePoint.lat) && Number.isFinite(item.geocodePoint.lng)
        ? `${item.geocodePoint.lat.toFixed(6)}, ${item.geocodePoint.lng.toFixed(6)}`
        : "-";
    lines.push(
      `| ${item.gipodId} | ${address} | ${datasetPoint} | ${geocodePoint} | ${item.distanceMeters ?? "-"} | ${item.status} |`
    );
  }

  lines.push("");
  lines.push("## Notities");
  lines.push("");
  lines.push("1. Dit is een snelle regressiecheck op een vaste adresset.");
  lines.push("2. Geocodebron: Nominatim (cache hergebruikt waar mogelijk).");
  lines.push("3. Bij structurele afwijking: valideren tegen GIPOD-kaart + bronadres en zo nodig importmapping bijsturen.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

async function run() {
  const thresholdMeters = readPositiveNumberEnv(
    "DN_KNOWN_ADDRESS_THRESHOLD_METERS",
    DEFAULT_THRESHOLD_METERS
  );

  const known = loadJsonFile(KNOWN_FILE, []);
  const works = loadJsonFile(WORKS_FILE, []);
  const geocodeCache = loadJsonFile(GEOCODE_CACHE_FILE, {});

  const workByGipodId = new Map(
    works
      .filter((item) => item && typeof item === "object" && normalize(item.gipodId))
      .map((item) => [normalize(item.gipodId), item])
  );

  const items = [];
  let geocodedNow = 0;
  let foundInDataset = 0;
  let okCount = 0;
  let deviationCount = 0;
  let missingCount = 0;

  for (const entry of known) {
    const gipodId = normalize(entry.gipodId);
    const record = workByGipodId.get(gipodId);
    const item = {
      gipodId,
      straat: normalize(entry.straat),
      huisnr: normalizeHouseNumber(entry.huisnr),
      postcode: normalize(entry.postcode),
      district: normalize(entry.district),
      datasetPoint: null,
      geocodePoint: null,
      distanceMeters: null,
      status: "MISSING",
    };

    if (!record) {
      missingCount += 1;
      items.push(item);
      continue;
    }

    foundInDataset += 1;
    item.datasetPoint = {
      lat: Number(record.location?.lat),
      lng: Number(record.location?.lng),
    };

    const cacheKey = toAddressKey(item);
    let cached = geocodeCache[cacheKey];
    if (cached === undefined) {
      const query = toAddressQuery(item);
      cached = await geocodeAddress(query);
      geocodeCache[cacheKey] = cached ?? null;
      geocodedNow += 1;
      await sleep(GEOCODE_DELAY_MS);
    }

    if (!cached || !Number.isFinite(cached.lat) || !Number.isFinite(cached.lng)) {
      item.status = "NO_GEOCODE";
      items.push(item);
      continue;
    }

    item.geocodePoint = {
      lat: Number(cached.lat),
      lng: Number(cached.lng),
    };

    const distanceMeters = haversineDistanceMeters(item.datasetPoint, item.geocodePoint);
    item.distanceMeters = Math.round(distanceMeters);
    if (distanceMeters <= thresholdMeters) {
      item.status = "OK";
      okCount += 1;
    } else {
      item.status = "AFWIJKING";
      deviationCount += 1;
    }

    items.push(item);
  }

  saveJsonFile(GEOCODE_CACHE_FILE, geocodeCache);

  const report = {
    generatedAt: new Date().toISOString(),
    thresholdMeters,
    totalKnown: known.length,
    foundInDataset,
    geocodedNow,
    okCount,
    deviationCount,
    missingCount,
    items,
  };

  saveJsonFile(REPORT_JSON_FILE, report);
  fs.writeFileSync(REPORT_MD_FILE, toMarkdown(report), "utf8");

  console.log(`[dn-dispatch] Known address check: total=${report.totalKnown}, found=${report.foundInDataset}, ok=${report.okCount}, afwijking=${report.deviationCount}, missing=${report.missingCount}`);
  console.log(`[dn-dispatch] Known address report JSON: ${REPORT_JSON_FILE}`);
  console.log(`[dn-dispatch] Known address report MD: ${REPORT_MD_FILE}`);
}

run();
