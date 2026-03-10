import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";
import proj4 from "proj4";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "DATA");
const EXPORT_FILE_PATTERN = /^export_\d+.*\.xlsx$/i;
const EXPORT_SHEET_NAME = "resultaten";
const WEEKRAPPORT_DN_DISPATCH_PATTERN =
  /^weekrapport[_\s-]?nutswerken[_\s-]?dn[_\s-]?dispatch.*\.xlsx$/i;
const WEEKRAPPORT_LEGACY_FILE = path.join(DATA_DIR, "Weekrapport Nutswerken totaallijst.xlsx");
const WEEKRAPPORT_SHEET_NAME = "Totaallijst";
const WEEKRAPPORT_REQUIRED_HEADERS = [
  "BONU-Nummer",
  "ReferentieID",
  "Gipod ID",
  "Startdatum werken",
  "Einddatum werken",
  "Straat",
  "Postcode",
  "Dossierstatus (actueel)",
  "Werftype",
];
const OUTPUT_FILE = path.join(ROOT, "src", "data", "works.generated.json");
const OUTPUT_PUBLIC_FILE = path.join(ROOT, "public", "data", "works.generated.json");
const OUTPUT_CSV_FILE = path.join(DATA_DIR, "dispatch_nuts_works.csv");
const LOCATION_ALIGNMENT_REPORT_FILE = path.join(DATA_DIR, "dispatch_location_alignment_report.json");
const LOCATION_QA_REPORT_FILE = path.join(DATA_DIR, "dispatch_location_qa_report.json");
const GEOCODE_CACHE_FILE = path.join(DATA_DIR, "geocode-cache.json");
const GEOCODE_DELAY_MS = 1100;
const DEFAULT_CENTER = { lat: 51.2194, lng: 4.4025 };
const ADDRESS_ALIGN_DEFAULT_THRESHOLD_METERS = 25;
const ADDRESS_ALIGN_DEFAULT_MAX_GEOCODES_PER_RUN = 120;
const ADDRESS_ALIGN_DEFAULT_MAX_REPORT_ITEMS = 200;
const ADDRESS_ALIGN_POSTCODE_MAX_DISTANCE_METERS = 3000;
const LOCATION_QA_DEFAULT_MAX_CHECKS = 25;
const LOCATION_QA_DEFAULT_THRESHOLD_METERS = 250;
const LOCATION_QA_DEFAULT_MAX_REPORT_ITEMS = 120;
const EPSG_31370 = "EPSG:31370";
const EPSG_4326 = "EPSG:4326";

// Officiële Lambert72-definitie met BD72 -> WGS84 transformatieparameters.
proj4.defs(
  EPSG_31370,
  "+proj=lcc +lat_0=90 +lon_0=4.367486666666666 +lat_1=51.16666723333333 +lat_2=49.8333339 +x_0=150000.013 +y_0=5400088.438 +ellps=intl +towgs84=106.868628,-52.297783,103.723893,0.33657,-0.456955,1.84218,-1.2747 +units=m +no_defs +type=crs"
);

const POSTCODE_CENTROIDS = {
  "2000": { lat: 51.2211, lng: 4.3997 },
  "2018": { lat: 51.2052, lng: 4.4211 },
  "2020": { lat: 51.1917, lng: 4.3812 },
  "2030": { lat: 51.2584, lng: 4.4008 },
  "2040": { lat: 51.3298, lng: 4.3288 },
  "2050": { lat: 51.2284, lng: 4.3774 },
  "2060": { lat: 51.231, lng: 4.4358 },
  "2100": { lat: 51.2078, lng: 4.4714 },
  "2140": { lat: 51.2098, lng: 4.4504 },
  "2150": { lat: 51.1888, lng: 4.4469 },
  "2170": { lat: 51.2507, lng: 4.4388 },
  "2180": { lat: 51.2821, lng: 4.4334 },
  "2600": { lat: 51.1994, lng: 4.4438 },
  "2610": { lat: 51.1634, lng: 4.3851 },
  "2627": { lat: 51.1648, lng: 4.3496 },
  "2660": { lat: 51.1746, lng: 4.3414 },
};

const POSTCODE_DISTRICTS = {
  "2000": "Antwerpen",
  "2018": "Antwerpen",
  "2020": "Antwerpen",
  "2030": "Antwerpen",
  "2040": "Berendrecht-Zandvliet-Lillo",
  "2050": "Antwerpen",
  "2060": "Antwerpen",
  "2100": "Deurne",
  "2140": "Borgerhout",
  "2150": "Borsbeek",
  "2170": "Merksem",
  "2180": "Ekeren",
  "2600": "Berchem",
  "2610": "Wilrijk",
  "2627": "Schelle",
  "2660": "Hoboken",
};

// Handmatige correcties op gekende bronafwijkingen.
// Deze overrides worden enkel gebruikt wanneer de exportdata aantoonbaar fout staat.
const MANUAL_GIPOD_OVERRIDES = {
  "19223308": {
    straat: "FRANKRIJKLEI",
    huisnr: "21",
    postcode: "2000",
    district: "Antwerpen",
    location: {
      lat: 51.2174792,
      lng: 4.4156403,
    },
    locationSource: "exact",
  },
  "19586569": {
    straat: "FRANKRIJKLEI",
    huisnr: "67",
    postcode: "2000",
    district: "Antwerpen",
    location: {
      lat: 51.2150917,
      lng: 4.4139436,
    },
    locationSource: "exact",
  },
  "19296287": {
    straat: "KRUIKSTRAAT",
    huisnr: "28",
    postcode: "2018",
    district: "Antwerpen",
    location: {
      lat: 51.2087443,
      lng: 4.4261632,
    },
    locationSource: "exact",
  },
  "19579833": {
    straat: "WIPSTRAAT",
    huisnr: "44",
    postcode: "2018",
    district: "Antwerpen",
    location: {
      lat: 51.2113085,
      lng: 4.4237056,
    },
    locationSource: "exact",
  },
  // Venusstraat Antwerpen: Lambert-bron wijst ~13km te ver zuid, Nominatim
  // retourneert foutief de Venusstraat in Schoten (2900) i.p.v. Antwerpen (2000).
  "13038867": {
    straat: "VENUSSTRAAT",
    huisnr: "1",
    postcode: "2000",
    district: "Antwerpen",
    location: {
      lat: 51.2171,
      lng: 4.4018,
    },
    locationSource: "exact",
  },
};

function normalize(value) {
  return `${value ?? ""}`.trim();
}

function normalizeDigits(value) {
  return normalize(value).replace(/\D/g, "");
}

function normalizeYesNoUnknown(value) {
  const cleaned = normalize(value).toLowerCase();
  if (cleaned.startsWith("j")) {
    return "ja";
  }
  if (cleaned.startsWith("n")) {
    return "nee";
  }
  return "onbekend";
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

function canonicalizeStreetForGeocode(value) {
  const cleaned = normalize(value)
    .replace(/\(.*?\)/g, " ")
    .replace(/->/g, " ")
    .replace(/\b(ter hoogte van|thv)\b/gi, " ")
    .replace(/[;,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function titleCase(value) {
  const source = normalize(value);
  if (!source) {
    return "";
  }
  return source
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(" ");
}

const NUTS_BEDRIJF_ALIASES = new Map([
  ["WYRE", "Wyre"],
  ["WATER-LINK", "Water-link"],
  ["WATER-LINK ", "Water-link"],
  ["WATER-LINK N.V.", "Water-link"],
  ["WATER-LINK NV", "Water-link"],
  ["PIDPA DRINKWATER", "PIDPA drinkwater"],
]);

function canonicalizeNutsBedrijf(value) {
  const cleaned = normalize(value).replace(/\s+/g, " ");
  if (!cleaned) {
    return "";
  }
  const key = cleaned.toUpperCase();
  if (NUTS_BEDRIJF_ALIASES.has(key)) {
    return NUTS_BEDRIJF_ALIASES.get(key);
  }
  return cleaned;
}

function normalizeSourceStatus(value) {
  const cleaned = normalize(value).toLowerCase();
  if (!cleaned) {
    return "";
  }
  if (cleaned.includes("in uitvoering") || cleaned.includes("lopende")) {
    return "In uitvoering";
  }
  if (cleaned.includes("concreet gepland")) {
    return "Concreet gepland";
  }
  if (cleaned.includes("niet uitgevoerd")) {
    return "Niet uitgevoerd";
  }
  if (cleaned.includes("uitgevoerd") || cleaned.includes("afgelopen")) {
    return "Uitgevoerd";
  }
  return titleCase(cleaned);
}

function mapSourceStatusToDispatchStatus(sourceStatus) {
  const raw = normalize(sourceStatus).toLowerCase();
  if (raw.includes("vergunning afgelopen") || raw.includes("vergunning verlopen")) {
    return "VERGUNNING VERLOPEN";
  }

  const cleaned = normalizeSourceStatus(sourceStatus);
  if (cleaned === "In uitvoering" || cleaned === "Uitgevoerd") {
    return "IN EFFECT";
  }
  return "VERGUND";
}

function normalizeGipodCategory(value) {
  const cleaned = normalize(value).toLowerCase();
  if (!cleaned) {
    return "";
  }
  if (cleaned.includes("categorie 1")) {
    return "Categorie 1";
  }
  if (cleaned.includes("categorie 2")) {
    return "Categorie 2";
  }
  if (cleaned.includes("categorie 3")) {
    return "Categorie 3";
  }
  if (cleaned.includes("dringend")) {
    return "Dringend";
  }
  return titleCase(cleaned);
}

function excelSerialToDate(serial) {
  const baseUtc = Date.UTC(1899, 11, 30);
  const millis = Math.round(Number(serial) * 24 * 60 * 60 * 1000);
  const date = new Date(baseUtc + millis);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function toIsoDate(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return null;
  }

  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const y = raw.getUTCFullYear();
    const m = `${raw.getUTCMonth() + 1}`.padStart(2, "0");
    const d = `${raw.getUTCDate()}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  if (typeof raw === "number") {
    const converted = excelSerialToDate(raw);
    const y = converted.year;
    const m = `${converted.month}`.padStart(2, "0");
    const d = `${converted.day}`.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const value = normalize(raw);
  if (!value) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const matchWithTime = value.match(
    /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?$/
  );
  if (matchWithTime) {
    const d = matchWithTime[1].padStart(2, "0");
    const m = matchWithTime[2].padStart(2, "0");
    const y = matchWithTime[3];
    return `${y}-${m}-${d}`;
  }

  return null;
}

function dateDiffInclusive(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  return Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function parseExportTimestamp(filename) {
  const match = filename.match(/export_(\d{8})(\d{0,6})/i);
  if (!match) {
    return null;
  }

  const date = match[1];
  const time = (match[2] || "").padEnd(6, "0");
  const timestampText = `${date}${time}`;
  const timestamp = Number(timestampText);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function pickLatestExportFile() {
  if (!fs.existsSync(DATA_DIR)) {
    return null;
  }

  const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && EXPORT_FILE_PATTERN.test(entry.name))
    .map((entry) => {
      const fullPath = path.join(DATA_DIR, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        fullPath,
        modifiedAt: stat.mtimeMs,
        exportStamp: parseExportTimestamp(entry.name) ?? 0,
      };
    });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => {
    if (b.exportStamp !== a.exportStamp) {
      return b.exportStamp - a.exportStamp;
    }
    return b.modifiedAt - a.modifiedAt;
  });

  return candidates[0];
}

function pickLatestWeekrapportDispatchFile() {
  if (!fs.existsSync(DATA_DIR)) {
    return null;
  }

  const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
  const candidates = entries
    .filter((entry) => entry.isFile() && WEEKRAPPORT_DN_DISPATCH_PATTERN.test(entry.name))
    .map((entry) => {
      const fullPath = path.join(DATA_DIR, entry.name);
      const stat = fs.statSync(fullPath);
      return {
        name: entry.name,
        fullPath,
        modifiedAt: stat.mtimeMs,
      };
    });

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => b.modifiedAt - a.modifiedAt);
  return candidates[0];
}

function resolveWeekrapportSource() {
  const latestDispatchWeekrapport = pickLatestWeekrapportDispatchFile();
  if (latestDispatchWeekrapport) {
    return latestDispatchWeekrapport;
  }

  if (fs.existsSync(WEEKRAPPORT_LEGACY_FILE)) {
    return {
      name: path.basename(WEEKRAPPORT_LEGACY_FILE),
      fullPath: WEEKRAPPORT_LEGACY_FILE,
      modifiedAt: fs.statSync(WEEKRAPPORT_LEGACY_FILE).mtimeMs,
    };
  }

  return null;
}

function normalizeHeaderLabel(value) {
  return normalize(value)
    .toLowerCase()
    .replace(/[_\-./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRowValue(row, ...headers) {
  if (!row || typeof row !== "object") {
    return "";
  }

  for (const header of headers) {
    if (Object.prototype.hasOwnProperty.call(row, header)) {
      return row[header];
    }
  }

  const normalizedRowKeys = new Map(
    Object.keys(row).map((key) => [normalizeHeaderLabel(key), key])
  );

  for (const header of headers) {
    const matchedKey = normalizedRowKeys.get(normalizeHeaderLabel(header));
    if (matchedKey !== undefined) {
      return row[matchedKey];
    }
  }

  return "";
}

function detectHeaderRowIndex(sheet, requiredHeaders) {
  if (!Array.isArray(requiredHeaders) || requiredHeaders.length === 0) {
    return 0;
  }

  const required = requiredHeaders.map((header) => normalizeHeaderLabel(header)).filter(Boolean);
  if (required.length === 0) {
    return 0;
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
  });
  const maxRowsToScan = Math.min(matrix.length, 30);

  for (let rowIndex = 0; rowIndex < maxRowsToScan; rowIndex += 1) {
    const row = Array.isArray(matrix[rowIndex]) ? matrix[rowIndex] : [];
    const rowLabels = new Set(row.map((cell) => normalizeHeaderLabel(cell)).filter(Boolean));
    if (required.every((header) => rowLabels.has(header))) {
      return rowIndex;
    }
  }

  return 0;
}

function loadWorkbookRows(inputFile, sheetName, options = {}) {
  const workbook = XLSX.readFile(inputFile, {
    raw: true,
    cellDates: false,
  });

  const sheet =
    workbook.Sheets[sheetName] ??
    workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) {
    throw new Error(`Worksheet '${sheetName}' not found in ${inputFile}`);
  }

  const headerRowIndex = detectHeaderRowIndex(sheet, options.requiredHeaders ?? []);

  return XLSX.utils.sheet_to_json(sheet, {
    defval: "",
    range: headerRowIndex,
  });
}

function parseLambertPoint(value) {
  const cleaned = normalize(value);
  if (!cleaned) {
    return null;
  }

  const match = cleaned.match(/POINT\s*\(\s*([-0-9.]+)\s+([-0-9.]+)\s*\)/i);
  if (!match) {
    return null;
  }

  const x = Number(match[1]);
  const y = Number(match[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function lambert72ToWgs84(x, y) {
  const [lng, lat] = proj4(EPSG_31370, EPSG_4326, [x, y]);
  return { lat, lng };
}

function parseDescriptionAddress(description) {
  const cleaned = normalize(description);
  if (!cleaned) {
    return {
      postcode: "",
      district: "",
      straat: "",
      huisnr: "",
    };
  }

  const parseStreetAndHouse = (value) => {
    const addressPart = normalize(value);
    if (!addressPart) {
      return { straat: "", huisnr: "" };
    }
    const streetAndHouse = addressPart.match(/^(.*?)(?:\s+([0-9][0-9A-Za-z\-\/]*))?$/);
    return {
      straat: normalize(streetAndHouse?.[1] ?? addressPart),
      huisnr: normalizeHouseNumber(streetAndHouse?.[2] ?? ""),
    };
  };

  const deriveStreetFromMunicipalityChunk = (municipalityChunk) => {
    const chunk = normalize(municipalityChunk).replace(/\s+/g, " ").trim();
    if (!chunk) {
      return { straat: "", huisnr: "" };
    }

    // Veel GIPOD-rijen gebruiken: "2060 ANTWERPEN VAN ... , Initiatief Regio (...)"
    // waarbij straat in het deel vóór de komma zit i.p.v. erna.
    const tokens = chunk.split(" ").filter(Boolean);
    if (tokens.length <= 1) {
      return { straat: "", huisnr: "" };
    }

    const withoutMunicipality = tokens.slice(1).join(" ");
    if (!withoutMunicipality) {
      return { straat: "", huisnr: "" };
    }

    return parseStreetAndHouse(withoutMunicipality);
  };

  const match = cleaned.match(/^(\d{4})\s+([^,]+),\s*(.+)$/i);
  if (!match) {
    const trailingPostcodePattern = cleaned.match(/^(.*?),\s*(\d{4})\s+(.+)$/i);
    if (trailingPostcodePattern) {
      const postcode = normalize(trailingPostcodePattern[2]);
      const municipality = titleCase(trailingPostcodePattern[3]);
      const parsed = parseStreetAndHouse(trailingPostcodePattern[1]);

      return {
        postcode,
        district: POSTCODE_DISTRICTS[postcode] ?? municipality,
        straat: parsed.straat,
        huisnr: parsed.huisnr,
      };
    }

    return {
      postcode: "",
      district: "",
      straat: cleaned,
      huisnr: "",
    };
  }

  const postcode = normalize(match[1]);
  const municipalityChunk = normalize(match[2]);
  const municipality = titleCase(municipalityChunk);
  const parsedFromRight = parseStreetAndHouse(match[3]);
  const parsedFromLeftChunk = deriveStreetFromMunicipalityChunk(municipalityChunk);

  const shouldUseLeftChunk =
    (looksLikeNoisyStreet(parsedFromRight.straat) || !normalize(parsedFromRight.huisnr)) &&
    normalize(parsedFromLeftChunk.straat).length > 0 &&
    !looksLikeNoisyStreet(parsedFromLeftChunk.straat);

  const straat = shouldUseLeftChunk ? parsedFromLeftChunk.straat : parsedFromRight.straat;
  const huisnr = shouldUseLeftChunk
    ? parsedFromLeftChunk.huisnr || parsedFromRight.huisnr
    : parsedFromRight.huisnr;

  return {
    postcode,
    district: POSTCODE_DISTRICTS[postcode] ?? municipality,
    straat,
    huisnr,
  };
}

function looksLikeNoisyStreet(value) {
  const cleaned = normalize(value);
  if (!cleaned) {
    return true;
  }

  const lowered = cleaned.toLowerCase();
  const noisyKeywords = [
    "werken",
    "lengte",
    "initiatief",
    "ringpark",
    "uitbreiding net",
    "distributienet",
    "nutsleiding",
    "verkaveling",
    "wegeniswerken",
    "ruggengraat",
    "regio",
    "drinkwaterleiding",
    "aanleg",
    "ter hoogte van",
  ];

  if (noisyKeywords.some((keyword) => lowered.includes(keyword))) {
    return true;
  }

  if (/^\d{4}\b/.test(cleaned)) {
    return true;
  }

  const dashCount = (cleaned.match(/\s-\s/g) ?? []).length;
  if (dashCount >= 2) {
    return true;
  }

  return false;
}

function resolveExportLocation(locationWkt, postcode) {
  const point = parseLambertPoint(locationWkt);
  if (point) {
    const converted = lambert72ToWgs84(point.x, point.y);
    if (Number.isFinite(converted.lat) && Number.isFinite(converted.lng)) {
      return {
        location: converted,
        locationSource: "exact",
      };
    }
  }

  return {
    location: POSTCODE_CENTROIDS[postcode] ?? DEFAULT_CENTER,
    locationSource: "postcode",
  };
}

function normalizeWeekrapportStatus(value) {
  return titleCase(normalize(value));
}

function mapWeekrapportStatusToPermitStatus(statusText) {
  const cleaned = normalize(statusText).toLowerCase();
  if (!cleaned) {
    return null;
  }

  if (cleaned.includes("vergunning afgelopen") || cleaned.includes("vergunning verlopen")) {
    return "GEWEIGERD_OF_STOPGEZET";
  }

  if (cleaned.includes("vergund")) {
    return "AFGELEVERD";
  }
  if (
    cleaned.includes("ingediend") ||
    cleaned.includes("in behandeling") ||
    cleaned.includes("aangevraagd")
  ) {
    return "IN_VOORBEREIDING";
  }
  if (
    cleaned.includes("afgekeurd") ||
    cleaned.includes("geannuleerd") ||
    cleaned.includes("stopgezet")
  ) {
    return "GEWEIGERD_OF_STOPGEZET";
  }

  return null;
}

function matchesBonuSelectionFilter(value) {
  const bonu = normalize(value).toUpperCase();
  if (!bonu) {
    return false;
  }

  const included =
    bonu.includes("BONU") ||
    bonu.includes("2024") ||
    bonu.includes("2025") ||
    bonu.includes("2026");
  if (!included) {
    return false;
  }

  if (bonu.includes("SWPR") || bonu.includes("SWOU")) {
    return false;
  }

  return true;
}

function buildWeekrapportPermitIndex(weekrapportFile) {
  if (!weekrapportFile || !fs.existsSync(weekrapportFile)) {
    return new Map();
  }

  const rows = loadWorkbookRows(weekrapportFile, WEEKRAPPORT_SHEET_NAME, {
    requiredHeaders: WEEKRAPPORT_REQUIRED_HEADERS,
  });
  const index = new Map();

  for (const row of rows) {
    const gipodId = normalizeDigits(getRowValue(row, "Gipod ID"));
    if (!gipodId) {
      continue;
    }
    const bonuNummer = normalize(getRowValue(row, "BONU-Nummer"));
    if (!matchesBonuSelectionFilter(bonuNummer)) {
      continue;
    }

    const next = {
      gipodId,
      dossierStatus: normalizeWeekrapportStatus(getRowValue(row, "Dossierstatus (actueel)")),
      bonuNummer,
      referentieId: normalize(getRowValue(row, "ReferentieID")),
      refKey: normalize(getRowValue(row, "Ref-key")),
      statusDateIso: toIsoDate(getRowValue(row, "Datum status")),
      nutsBedrijf: canonicalizeNutsBedrijf(getRowValue(row, "NUTS-bedrijf")),
      straat: normalize(getRowValue(row, "Straat")),
      huisnr: normalizeHouseNumber(getRowValue(row, "Huisnr")),
      postcode: normalize(getRowValue(row, "Postcode")),
      district: normalize(getRowValue(row, "District")),
    };

    const previous = index.get(gipodId);
    if (!previous) {
      index.set(gipodId, next);
      continue;
    }

    const prevDate = previous.statusDateIso ?? "";
    const nextDate = next.statusDateIso ?? "";
    if (nextDate > prevDate) {
      index.set(gipodId, next);
    }
  }

  return index;
}

function resolvePermitFields(permitEntry, gipodCategory) {
  if (permitEntry) {
    const mapped = mapWeekrapportStatusToPermitStatus(permitEntry.dossierStatus);
    return {
      permitStatus: mapped ?? "ONBEKEND",
      permitStatusSource: mapped ? "weekrapport_status" : "weekrapport_zonder_mapping",
      permitJoinConfidence: "high",
      permitReferenceId: permitEntry.referentieId,
      permitRefKey: permitEntry.refKey,
      permitBonuNummer: permitEntry.bonuNummer,
      permitDossierStatus: permitEntry.dossierStatus,
    };
  }

  if (gipodCategory === "Categorie 1" || gipodCategory === "Categorie 2") {
    return {
      permitStatus: "ONBEKEND_MAAR_VERWACHT",
      permitStatusSource: "afgeleid_categorie",
      permitJoinConfidence: "low",
      permitReferenceId: "",
      permitRefKey: "",
      permitBonuNummer: "",
      permitDossierStatus: "",
    };
  }

  return {
    permitStatus: "NIET_VEREIST",
    permitStatusSource: "afgeleid_categorie",
    permitJoinConfidence: "low",
    permitReferenceId: "",
    permitRefKey: "",
    permitBonuNummer: "",
    permitDossierStatus: "",
  };
}

function applyManualGipodOverride(record) {
  if (!record || !record.gipodId) {
    return record;
  }

  const override = MANUAL_GIPOD_OVERRIDES[record.gipodId];
  if (!override) {
    return record;
  }

  return {
    ...record,
    straat: override.straat ?? record.straat,
    huisnr: override.huisnr ?? record.huisnr,
    postcode: override.postcode ?? record.postcode,
    district: override.district ?? record.district,
    location: override.location ?? record.location,
    locationSource: override.locationSource ?? record.locationSource,
  };
}

function buildWorkFromExportRow(row, index, permitIndex) {
  const gipodId = normalizeDigits(row["Id"]);
  if (!gipodId) {
    return null;
  }

  const sourceStatus = normalizeSourceStatus(row["Status"]);
  if (!sourceStatus) {
    return null;
  }

  const startDate = toIsoDate(row["Start"]);
  const endDate = toIsoDate(row["Einde"]);
  if (!startDate || !endDate) {
    return null;
  }

  if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
    return null;
  }

  const gipodCategory = normalizeGipodCategory(row["Categorie"]);
  const parsedAddress = parseDescriptionAddress(row["Beschrijving"]);
  const permitEntry = permitIndex.get(gipodId);
  const permitFields = resolvePermitFields(permitEntry, gipodCategory);
  const nutsBedrijf =
    canonicalizeNutsBedrijf(row["Beheerder"]) || canonicalizeNutsBedrijf(permitEntry?.nutsBedrijf);

  const usePermitAddressFallback =
    Boolean(permitEntry) &&
    (looksLikeNoisyStreet(parsedAddress.straat) || !normalize(parsedAddress.huisnr));

  const postcode = usePermitAddressFallback
    ? permitEntry?.postcode || parsedAddress.postcode || ""
    : parsedAddress.postcode || permitEntry?.postcode || "";
  if (!postcode) {
    return null;
  }

  const straat = usePermitAddressFallback
    ? permitEntry?.straat || parsedAddress.straat || ""
    : parsedAddress.straat || permitEntry?.straat || "";
  const huisnr = usePermitAddressFallback
    ? permitEntry?.huisnr || parsedAddress.huisnr || ""
    : parsedAddress.huisnr || permitEntry?.huisnr || "";
  const district = usePermitAddressFallback
    ? permitEntry?.district || parsedAddress.district || POSTCODE_DISTRICTS[postcode] || "Onbekend"
    : parsedAddress.district || permitEntry?.district || POSTCODE_DISTRICTS[postcode] || "Onbekend";

  const locationResult = resolveExportLocation(row["Locatie"], postcode);

  const workRecord = {
    id: `gipod-${gipodId}-${index + 1}`,
    dossierId: `GIPOD-${gipodId}`,
    bonuNummer: permitFields.permitBonuNummer || "",
    referentieId: gipodId,
    gipodId,
    gipodReferentie: normalize(row["Referentie"]),
    werftype: normalize(row["Soort"]) || "Nutswerken",
    status: mapSourceStatusToDispatchStatus(sourceStatus),
    sourceStatus,
    startDate,
    endDate,
    postcode,
    district,
    straat,
    huisnr,
    nutsBedrijf,
    durationDays: dateDiffInclusive(startDate, endDate),
    location: locationResult.location,
    locationSource: locationResult.locationSource,
    gipodSoort: normalize(row["Soort"]),
    gipodType: normalize(row["Type"]),
    gipodCategorie: gipodCategory,
    vgwUitgestuurd: normalizeYesNoUnknown(row["VGW uitgestuurd"]),
    permitStatus: permitFields.permitStatus,
    permitStatusSource: permitFields.permitStatusSource,
    permitJoinConfidence: permitFields.permitJoinConfidence,
    permitReferenceId: permitFields.permitReferenceId,
    permitRefKey: permitFields.permitRefKey,
    permitBonuNummer: permitFields.permitBonuNummer,
    permitDossierStatus: permitFields.permitDossierStatus,
    sourceDataset: "gipod_export",
  };

  return applyManualGipodOverride(workRecord);
}

function isNutsDossier(value) {
  return matchesBonuSelectionFilter(value);
}

function mapWeekrapportStatusToDispatchStatus(value) {
  const cleaned = normalize(value).toLowerCase();
  if (!cleaned) {
    return null;
  }

  if (cleaned.includes("vergunning afgelopen") || cleaned.includes("vergunning verlopen")) {
    return "VERGUNNING VERLOPEN";
  }

  if (
    cleaned.includes("in effect") ||
    cleaned.includes("in uitvoering") ||
    cleaned.includes("lopende")
  ) {
    return "IN EFFECT";
  }

  if (cleaned.includes("vergund")) {
    return "VERGUND";
  }

  return null;
}

function isAllowedWerftype(value) {
  const werftype = normalize(value).toUpperCase();
  return werftype === "NUTSWERKEN";
}

function loadGeocodeCache() {
  if (!fs.existsSync(GEOCODE_CACHE_FILE)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(GEOCODE_CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveGeocodeCache(cache) {
  fs.writeFileSync(GEOCODE_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

function readPositiveIntEnv(name, fallback) {
  const raw = normalize(process.env[name]);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readPositiveNumberEnv(name, fallback) {
  const raw = normalize(process.env[name]);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function toAddressQuery(record) {
  const house = normalizeHouseNumber(record.huisnr);
  const street = canonicalizeStreetForGeocode(record.straat) || normalize(record.straat);
  const main = house ? `${street} ${house}` : street;
  const district = normalize(record.district) || "Antwerpen";
  return `${main}, ${record.postcode} ${district}, Belgium`;
}

function toAddressKey(record) {
  const house = normalizeHouseNumber(record.huisnr);
  const street = canonicalizeStreetForGeocode(record.straat);
  return `${street}|${house}|${record.postcode}`.toLowerCase();
}

function toLegacyAddressKey(record) {
  const house = normalizeHouseNumber(record.huisnr);
  return `${record.straat}|${house}|${record.postcode}`.toLowerCase();
}

async function geocodeAddress(query) {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&limit=1&countrycodes=be&q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "DN-Dispatch/0.1 (prototype geocoder)",
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
    provider: "nominatim",
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

function isAddressAlignCandidate(record) {
  if (record.locationSource !== "exact") {
    return false;
  }

  if (!normalize(record.straat) || !normalize(record.postcode)) {
    return false;
  }

  return normalizeHouseNumber(record.huisnr).length > 0;
}

function getAddressAlignStatusRank(sourceStatus) {
  const cleaned = normalizeSourceStatus(sourceStatus);
  if (cleaned.includes("in uitvoering") || cleaned.includes("lopende")) {
    return 4;
  }
  if (cleaned.includes("concreet gepland") || cleaned.includes("gepland")) {
    return 3;
  }
  if (cleaned.includes("niet uitgevoerd")) {
    return 2;
  }
  if (cleaned.includes("uitgevoerd") || cleaned.includes("afgelopen")) {
    return 1;
  }
  return 0;
}

function getAddressAlignPermitRank(permitStatus) {
  const cleaned = normalize(permitStatus).toUpperCase();
  if (cleaned === "AFGELEVERD") {
    return 3;
  }
  if (cleaned === "IN_VOORBEREIDING" || cleaned === "ONBEKEND_MAAR_VERWACHT") {
    return 2;
  }
  if (cleaned === "NIET_VEREIST") {
    return 1;
  }
  return 0;
}

function getAddressAlignCategoryRank(gipodCategorie) {
  const cleaned = normalize(gipodCategorie).toLowerCase();
  if (cleaned === "categorie 1") {
    return 3;
  }
  if (cleaned === "categorie 2") {
    return 2;
  }
  if (cleaned === "dringend") {
    return 2;
  }
  if (cleaned === "categorie 3") {
    return 1;
  }
  return 0;
}

function isSignalisatiePriorityRecord(record) {
  if (normalize(record.sourceDataset) === "weekrapport_fallback") {
    return true;
  }

  if (normalize(record.permitRefKey) || normalize(record.permitReferenceId)) {
    return true;
  }

  const permitStatus = normalize(record.permitStatus).toUpperCase();
  return (
    permitStatus === "AFGELEVERD" ||
    permitStatus === "IN_VOORBEREIDING" ||
    permitStatus === "GEWEIGERD_OF_STOPGEZET"
  );
}

function getDateSortKey(value) {
  const normalized = normalize(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : "9999-99-99";
}

function getAddressAlignPriorityScore(record) {
  const dispatchRank = normalize(record.status) === "IN EFFECT" ? 3 : 1;
  const sourceRank = getAddressAlignStatusRank(record.sourceStatus);
  const permitRank = getAddressAlignPermitRank(record.permitStatus);
  const categoryRank = getAddressAlignCategoryRank(record.gipodCategorie);
  const signalisatiePriority = isSignalisatiePriorityRecord(record) ? 1 : 0;

  return (
    signalisatiePriority * 10000 +
    dispatchRank * 1000 +
    sourceRank * 100 +
    permitRank * 20 +
    categoryRank * 5
  );
}

function compareAddressAlignPriority(a, b) {
  const scoreDiff = getAddressAlignPriorityScore(b) - getAddressAlignPriorityScore(a);
  if (scoreDiff !== 0) {
    return scoreDiff;
  }

  const endDateDiff = getDateSortKey(a.endDate).localeCompare(getDateSortKey(b.endDate));
  if (endDateDiff !== 0) {
    return endDateDiff;
  }

  const startDateDiff = getDateSortKey(a.startDate).localeCompare(getDateSortKey(b.startDate));
  if (startDateDiff !== 0) {
    return startDateDiff;
  }

  return normalize(a.id).localeCompare(normalize(b.id), "nl", { numeric: true });
}

async function alignExportLocationsWithAddress(records, { skipGeocode }) {
  const enabled = process.env.DN_ADDRESS_ALIGN_ENABLED !== "0";
  const thresholdMeters = readPositiveNumberEnv(
    "DN_ADDRESS_ALIGN_THRESHOLD_METERS",
    ADDRESS_ALIGN_DEFAULT_THRESHOLD_METERS
  );
  const maxGeocodesPerRun = readPositiveIntEnv(
    "DN_ADDRESS_ALIGN_MAX_GEOCODES_PER_RUN",
    ADDRESS_ALIGN_DEFAULT_MAX_GEOCODES_PER_RUN
  );
  const maxReportItems = readPositiveIntEnv(
    "DN_ADDRESS_ALIGN_MAX_REPORT_ITEMS",
    ADDRESS_ALIGN_DEFAULT_MAX_REPORT_ITEMS
  );

  const baseSummary = {
    enabled,
    thresholdMeters,
    maxGeocodesPerRun,
    maxReportItems,
    candidatesTotal: 0,
    checked: 0,
    alignedCount: 0,
    geocodedNow: 0,
    skippedReason: "",
    budgetExhausted: false,
    maxDeviationMeters: 0,
  };

  if (!enabled) {
    const report = {
      generatedAt: new Date().toISOString(),
      ...baseSummary,
      skippedReason: "DN_ADDRESS_ALIGN_ENABLED=0",
      aligned: [],
    };
    fs.writeFileSync(LOCATION_ALIGNMENT_REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
    return { output: records, summary: report };
  }

  const cache = loadGeocodeCache();
  const aligned = [];
  const output = [];
  const candidates = records.filter(isAddressAlignCandidate);
  const candidatesTotal = candidates.length;
  let checked = 0;
  let alignedCount = 0;
  let geocodedNow = 0;
  let budgetExhausted = false;
  let maxDeviationMeters = 0;

  if (!skipGeocode) {
    const representativeByKey = new Map();

    for (const record of candidates) {
      const key = toAddressKey(record);
      const legacyKey = toLegacyAddressKey(record);
      if (cache[key] !== undefined || cache[legacyKey] !== undefined) {
        continue;
      }

      const previous = representativeByKey.get(key);
      if (!previous || compareAddressAlignPriority(record, previous) < 0) {
        representativeByKey.set(key, record);
      }
    }

    const prioritized = [...representativeByKey.values()].sort(compareAddressAlignPriority);
    const geocodeTargets = prioritized.slice(0, maxGeocodesPerRun);
    budgetExhausted = prioritized.length > geocodeTargets.length;

    for (const target of geocodeTargets) {
      const key = toAddressKey(target);
      const legacyKey = toLegacyAddressKey(target);
      const query = toAddressQuery(target);
      const result = await geocodeAddress(query);
      cache[key] = result ?? null;
      cache[legacyKey] = result ?? null;
      geocodedNow += 1;
      await sleep(GEOCODE_DELAY_MS);
    }
  }

  for (const record of records) {
    if (!isAddressAlignCandidate(record)) {
      output.push(record);
      continue;
    }

    const key = toAddressKey(record);
    const legacyKey = toLegacyAddressKey(record);
    let cached = cache[key];
    if (cached === undefined) {
      cached = cache[legacyKey];
    }

    if (cached === undefined) {
      output.push(record);
      continue;
    }

    if (!cached || !Number.isFinite(cached.lat) || !Number.isFinite(cached.lng)) {
      output.push(record);
      continue;
    }

    // Postcode proximity validation: reject Nominatim results that fall too far
    // from the declared postcode centroid (e.g. Venusstraat Antwerpen → Schoten).
    const postcodeCentroid = POSTCODE_CENTROIDS[record.postcode];
    if (postcodeCentroid) {
      const distanceToPostcode = haversineDistanceMeters(postcodeCentroid, {
        lat: cached.lat,
        lng: cached.lng,
      });
      if (distanceToPostcode > ADDRESS_ALIGN_POSTCODE_MAX_DISTANCE_METERS) {
        // Geocode result is in a different area than the declared postcode — skip.
        output.push(record);
        continue;
      }
    }

    const distanceMeters = haversineDistanceMeters(record.location, {
      lat: cached.lat,
      lng: cached.lng,
    });
    checked += 1;
    maxDeviationMeters = Math.max(maxDeviationMeters, distanceMeters);

    if (distanceMeters < thresholdMeters) {
      output.push(record);
      continue;
    }

    alignedCount += 1;
    const adjustedRecord = {
      ...record,
      location: {
        lat: cached.lat,
        lng: cached.lng,
      },
      locationSource: "exact",
    };
    output.push(adjustedRecord);

    if (aligned.length < maxReportItems) {
      aligned.push({
        workId: record.id,
        gipodId: record.gipodId,
        adres: `${record.straat} ${record.huisnr}, ${record.postcode} ${record.district}`,
        before: record.location,
        after: adjustedRecord.location,
        deviationMeters: Math.round(distanceMeters),
        geocodeDisplayName: cached.displayName ?? "",
      });
    }
  }

  if (geocodedNow > 0 && !skipGeocode) {
    saveGeocodeCache(cache);
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    ...baseSummary,
    candidatesTotal,
    checked,
    alignedCount,
    geocodedNow,
    skippedReason: skipGeocode ? "DN_SKIP_GEOCODE=1 (cache-only alignment)" : "",
    budgetExhausted,
    maxDeviationMeters: Math.round(maxDeviationMeters),
    aligned,
  };

  fs.writeFileSync(LOCATION_ALIGNMENT_REPORT_FILE, JSON.stringify(summary, null, 2), "utf8");
  return { output, summary };
}

function pickLocationQaCandidates(records, maxChecks) {
  const eligible = records.filter((record) => {
    if (record.locationSource !== "exact") {
      return false;
    }
    if (!normalize(record.straat) || !normalize(record.postcode)) {
      return false;
    }
    return normalizeHouseNumber(record.huisnr).length > 0;
  });

  if (eligible.length <= maxChecks) {
    return eligible;
  }

  const picked = [];
  const stride = eligible.length / maxChecks;
  for (let index = 0; index < maxChecks; index += 1) {
    const sourceIndex = Math.floor(index * stride);
    const candidate = eligible[sourceIndex];
    if (candidate) {
      picked.push(candidate);
    }
  }

  return picked;
}

async function runLocationQa(records, { skipGeocode }) {
  const enabled = process.env.DN_LOCATION_QA_ENABLED !== "0";
  const maxChecks = readPositiveIntEnv(
    "DN_LOCATION_QA_MAX_CHECKS",
    LOCATION_QA_DEFAULT_MAX_CHECKS
  );
  const thresholdMeters = readPositiveNumberEnv(
    "DN_LOCATION_QA_THRESHOLD_METERS",
    LOCATION_QA_DEFAULT_THRESHOLD_METERS
  );
  const maxReportItems = readPositiveIntEnv(
    "DN_LOCATION_QA_MAX_REPORT_ITEMS",
    LOCATION_QA_DEFAULT_MAX_REPORT_ITEMS
  );

  const baseSummary = {
    enabled,
    maxChecks,
    thresholdMeters,
    maxReportItems,
    candidatesTotal: 0,
    checked: 0,
    geocodedNow: 0,
    suspiciousCount: 0,
    maxDeviationMeters: 0,
    skippedReason: "",
  };

  if (!enabled) {
    const report = {
      generatedAt: new Date().toISOString(),
      ...baseSummary,
      skippedReason: "DN_LOCATION_QA_ENABLED=0",
      suspicious: [],
    };
    fs.writeFileSync(LOCATION_QA_REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
    return report;
  }

  const candidates = pickLocationQaCandidates(records, maxChecks);
  const cache = loadGeocodeCache();
  const suspicious = [];
  let checked = 0;
  let geocodedNow = 0;
  let maxDeviationMeters = 0;

  for (const candidate of candidates) {
    const key = toAddressKey(candidate);
    const legacyKey = toLegacyAddressKey(candidate);
    const query = toAddressQuery(candidate);
    let cached = cache[key];
    if (cached === undefined) {
      cached = cache[legacyKey];
    }

    if (cached === undefined) {
      if (skipGeocode) {
        continue;
      }
      const result = await geocodeAddress(query);
      cache[key] = result ?? null;
      cache[legacyKey] = result ?? null;
      cached = cache[key];
      geocodedNow += 1;
      await sleep(GEOCODE_DELAY_MS);
    }

    if (!cached || !Number.isFinite(cached.lat) || !Number.isFinite(cached.lng)) {
      continue;
    }

    const distanceMeters = haversineDistanceMeters(candidate.location, {
      lat: cached.lat,
      lng: cached.lng,
    });
    checked += 1;
    maxDeviationMeters = Math.max(maxDeviationMeters, distanceMeters);

    if (distanceMeters >= thresholdMeters) {
      suspicious.push({
        workId: candidate.id,
        gipodId: candidate.gipodId,
        adres: `${candidate.straat} ${candidate.huisnr}, ${candidate.postcode} ${candidate.district}`,
        datasetPoint: candidate.location,
        geocodePoint: {
          lat: cached.lat,
          lng: cached.lng,
        },
        deviationMeters: Math.round(distanceMeters),
        geocodeDisplayName: cached.displayName ?? "",
      });
    }
  }

  if (geocodedNow > 0 && !skipGeocode) {
    saveGeocodeCache(cache);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    ...baseSummary,
    candidatesTotal: candidates.length,
    checked,
    geocodedNow,
    suspiciousCount: suspicious.length,
    maxDeviationMeters: Math.round(maxDeviationMeters),
    skippedReason: skipGeocode ? "DN_SKIP_GEOCODE=1 (cache-only QA)" : "",
    suspicious: suspicious
      .sort((a, b) => b.deviationMeters - a.deviationMeters)
      .slice(0, maxReportItems),
  };

  fs.writeFileSync(LOCATION_QA_REPORT_FILE, JSON.stringify(report, null, 2), "utf8");
  return report;
}

function buildWorkFromWeekrapportRow(row, index) {
  const bonu = normalize(getRowValue(row, "BONU-Nummer"));
  const refId = normalize(getRowValue(row, "ReferentieID"));
  const gipodId = normalizeDigits(getRowValue(row, "Gipod ID"));
  const dossierId = bonu && bonu.toUpperCase() !== "NIET VAN TOEPASSING" ? bonu : refId;

  if (!isNutsDossier(bonu)) {
    return null;
  }

  const werftype = normalize(getRowValue(row, "Werftype"));
  if (!isAllowedWerftype(werftype)) {
    return null;
  }

  const status = mapWeekrapportStatusToDispatchStatus(getRowValue(row, "Dossierstatus (actueel)"));
  if (!status) {
    return null;
  }

  const startDate = toIsoDate(getRowValue(row, "Startdatum werken"));
  const endDate = toIsoDate(getRowValue(row, "Einddatum werken"));
  if (!startDate || !endDate) {
    return null;
  }

  if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
    return null;
  }

  const permitStatus = mapWeekrapportStatusToPermitStatus(
    getRowValue(row, "Dossierstatus (actueel)")
  );

  return {
    id: `${dossierId}-${index + 1}`,
    dossierId,
    bonuNummer: bonu,
    referentieId: refId,
    gipodId,
    gipodReferentie: refId,
    werftype,
    status,
    sourceStatus: normalizeWeekrapportStatus(getRowValue(row, "Dossierstatus (actueel)")) || status,
    startDate,
    endDate,
    postcode: normalize(getRowValue(row, "Postcode")),
    district: normalize(getRowValue(row, "District")),
    straat: normalize(getRowValue(row, "Straat")),
    huisnr: normalize(getRowValue(row, "Huisnr")),
    nutsBedrijf: canonicalizeNutsBedrijf(getRowValue(row, "NUTS-bedrijf")),
    durationDays: dateDiffInclusive(startDate, endDate),
    location: POSTCODE_CENTROIDS[normalize(getRowValue(row, "Postcode"))] ?? DEFAULT_CENTER,
    locationSource: "postcode",
    gipodSoort: "",
    gipodType: "",
    gipodCategorie: "",
    vgwUitgestuurd: "onbekend",
    permitStatus: permitStatus ?? "ONBEKEND",
    permitStatusSource: "weekrapport_status",
    permitJoinConfidence: "medium",
    permitReferenceId: refId,
    permitRefKey: normalize(getRowValue(row, "Ref-key")),
    permitBonuNummer: bonu,
    permitDossierStatus: normalizeWeekrapportStatus(getRowValue(row, "Dossierstatus (actueel)")),
    sourceDataset: "weekrapport_fallback",
  };
}

async function resolveLegacyFallbackLocations(records) {
  const cache = loadGeocodeCache();
  const missing = [];

  for (const record of records) {
    const key = toAddressKey(record);
    const query = toAddressQuery(record);

    if (!record.straat || !record.postcode) {
      continue;
    }

    if (cache[key] === undefined) {
      missing.push({ key, query });
    }
  }

  let geocodedNow = 0;
  const skipGeocode = process.env.DN_SKIP_GEOCODE === "1";
  if (!skipGeocode) {
    for (const entry of missing) {
      const result = await geocodeAddress(entry.query);
      cache[entry.key] = result ?? null;
      geocodedNow += 1;
      await sleep(GEOCODE_DELAY_MS);
    }
  }

  if (missing.length > 0 && !skipGeocode) {
    saveGeocodeCache(cache);
  }

  const output = records.map((record) => {
    const key = toAddressKey(record);
    const cached = cache[key];
    const postcodeCenter = POSTCODE_CENTROIDS[record.postcode] ?? DEFAULT_CENTER;

    if (cached && Number.isFinite(cached.lat) && Number.isFinite(cached.lng)) {
      return {
        ...record,
        location: { lat: cached.lat, lng: cached.lng },
        locationSource: "exact",
      };
    }

    return {
      ...record,
      location: postcodeCenter,
      locationSource: "postcode",
    };
  });

  const exactCount = output.filter((record) => record.locationSource === "exact").length;
  return { output, geocodedNow, exactCount, skipGeocode };
}

function toCsv(records) {
  if (records.length === 0) {
    return "";
  }

  const headers = [
    "id",
    "dossierId",
    "bonuNummer",
    "referentieId",
    "gipodId",
    "gipodReferentie",
    "werftype",
    "status",
    "sourceStatus",
    "startDate",
    "endDate",
    "postcode",
    "district",
    "straat",
    "huisnr",
    "nutsBedrijf",
    "durationDays",
    "lat",
    "lng",
    "locationSource",
    "gipodSoort",
    "gipodType",
    "gipodCategorie",
    "vgwUitgestuurd",
    "permitStatus",
    "permitStatusSource",
    "permitJoinConfidence",
    "permitReferenceId",
    "permitRefKey",
    "permitBonuNummer",
    "permitDossierStatus",
    "sourceDataset",
  ];

  const escapeCsv = (value) => {
    const stringValue = `${value ?? ""}`;
    if (/[",\n]/.test(stringValue)) {
      return `"${stringValue.replace(/"/g, "\"\"")}"`;
    }
    return stringValue;
  };

  const lines = [headers.join(",")];

  for (const record of records) {
    const row = [
      record.id,
      record.dossierId,
      record.bonuNummer,
      record.referentieId,
      record.gipodId,
      record.gipodReferentie,
      record.werftype,
      record.status,
      record.sourceStatus,
      record.startDate,
      record.endDate,
      record.postcode,
      record.district,
      record.straat,
      record.huisnr,
      record.nutsBedrijf,
      record.durationDays,
      record.location.lat,
      record.location.lng,
      record.locationSource,
      record.gipodSoort,
      record.gipodType,
      record.gipodCategorie,
      record.vgwUitgestuurd,
      record.permitStatus,
      record.permitStatusSource,
      record.permitJoinConfidence,
      record.permitReferenceId,
      record.permitRefKey,
      record.permitBonuNummer,
      record.permitDossierStatus,
      record.sourceDataset,
    ];

    lines.push(row.map(escapeCsv).join(","));
  }

  return `${lines.join("\n")}\n`;
}

function resolveInputSource(weekrapportSource) {
  const latestExport = pickLatestExportFile();
  if (latestExport) {
    return {
      kind: "gipod_export",
      file: latestExport.fullPath,
      sheet: EXPORT_SHEET_NAME,
      note: latestExport.name,
    };
  }

  if (weekrapportSource) {
    return {
      kind: "weekrapport_fallback",
      file: weekrapportSource.fullPath,
      sheet: WEEKRAPPORT_SHEET_NAME,
      note: weekrapportSource.name,
    };
  }

  throw new Error(
    `Geen invoerbestand gevonden. Verwachtte bron: ${DATA_DIR} met Export_*.xlsx of Weekrapport_Nutswerken_DN_DISPATCH*.xlsx (fallback: ${WEEKRAPPORT_LEGACY_FILE}).`
  );
}

async function run() {
  const weekrapportSource = resolveWeekrapportSource();
  const source = resolveInputSource(weekrapportSource);
  const rows =
    source.kind === "weekrapport_fallback"
      ? loadWorkbookRows(source.file, source.sheet, {
          requiredHeaders: WEEKRAPPORT_REQUIRED_HEADERS,
        })
      : loadWorkbookRows(source.file, source.sheet);
  const permitIndex = buildWeekrapportPermitIndex(weekrapportSource?.fullPath ?? null);

  let output = [];
  let exactCount = 0;
  let geocodedNow = 0;
  let skipGeocode = false;
  let locationAlignmentSummary = null;
  let locationQaSummary = null;

  if (source.kind === "gipod_export") {
    output = rows
      .map((row, index) => buildWorkFromExportRow(row, index, permitIndex))
      .filter(Boolean);
    exactCount = output.filter((record) => record.locationSource === "exact").length;
  } else {
    const skeletons = rows.map((row, index) => buildWorkFromWeekrapportRow(row, index)).filter(Boolean);
    const locationResult = await resolveLegacyFallbackLocations(skeletons);
    output = locationResult.output;
    exactCount = locationResult.exactCount;
    geocodedNow = locationResult.geocodedNow;
    skipGeocode = locationResult.skipGeocode;
  }

  output = output
    .slice()
    .sort((a, b) => {
      if (a.startDate !== b.startDate) {
        return a.startDate.localeCompare(b.startDate);
      }
      return a.postcode.localeCompare(b.postcode, "nl", { numeric: true });
    });

  const alignmentResult = await alignExportLocationsWithAddress(output, { skipGeocode });
  output = alignmentResult.output;
  locationAlignmentSummary = alignmentResult.summary;

  locationQaSummary = await runLocationQa(output, { skipGeocode });

  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), "utf8");
  fs.mkdirSync(path.dirname(OUTPUT_PUBLIC_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_PUBLIC_FILE, JSON.stringify(output, null, 2), "utf8");
  fs.writeFileSync(OUTPUT_CSV_FILE, toCsv(output), "utf8");

  const countsByStatus = output.reduce(
    (acc, work) => {
      acc[work.status] = (acc[work.status] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const countsBySourceStatus = output.reduce(
    (acc, work) => {
      const key = work.sourceStatus || "Onbekend";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const countsByCategory = output.reduce(
    (acc, work) => {
      const key = work.gipodCategorie || "Onbekend";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const countsByPermitStatus = output.reduce(
    (acc, work) => {
      const key = work.permitStatus || "Onbekend";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {}
  );

  console.log(`[dn-dispatch] Input source: ${source.kind} (${source.note})`);
  console.log(
    `[dn-dispatch] Permit weekrapport source: ${
      weekrapportSource ? weekrapportSource.name : "geen weekrapport gevonden"
    }`
  );
  console.log(`[dn-dispatch] Input rows: ${rows.length}`);
  console.log(`[dn-dispatch] Output works: ${output.length}`);
  console.log(`[dn-dispatch] Exact locations: ${exactCount}`);
  console.log(`[dn-dispatch] Geocoded this run: ${geocodedNow}`);
  if (skipGeocode) {
    console.log("[dn-dispatch] Geocode skipped via DN_SKIP_GEOCODE=1");
  }
  if (locationAlignmentSummary) {
    console.log(
      `[dn-dispatch] Address alignment: checked=${locationAlignmentSummary.checked}/${locationAlignmentSummary.candidatesTotal}, aligned(>=${locationAlignmentSummary.thresholdMeters}m)=${locationAlignmentSummary.alignedCount}, geocoded=${locationAlignmentSummary.geocodedNow}`
    );
    if (locationAlignmentSummary.maxDeviationMeters > 0) {
      console.log(
        `[dn-dispatch] Address alignment max deviation: ${locationAlignmentSummary.maxDeviationMeters}m`
      );
    }
    if (locationAlignmentSummary.budgetExhausted) {
      console.log(
        `[dn-dispatch] Address alignment note: geocode budget bereikt (${locationAlignmentSummary.maxGeocodesPerRun})`
      );
    }
    if (locationAlignmentSummary.skippedReason) {
      console.log(`[dn-dispatch] Address alignment note: ${locationAlignmentSummary.skippedReason}`);
    }
    console.log(`[dn-dispatch] Address alignment report: ${LOCATION_ALIGNMENT_REPORT_FILE}`);
  }
  if (locationQaSummary) {
    console.log(
      `[dn-dispatch] Location QA: checked=${locationQaSummary.checked}/${locationQaSummary.candidatesTotal}, suspicious(>=${locationQaSummary.thresholdMeters}m)=${locationQaSummary.suspiciousCount}, geocoded=${locationQaSummary.geocodedNow}`
    );
    if (locationQaSummary.maxDeviationMeters > 0) {
      console.log(
        `[dn-dispatch] Location QA max deviation: ${locationQaSummary.maxDeviationMeters}m`
      );
    }
    if (locationQaSummary.skippedReason) {
      console.log(`[dn-dispatch] Location QA note: ${locationQaSummary.skippedReason}`);
    }
    console.log(`[dn-dispatch] Location QA report: ${LOCATION_QA_REPORT_FILE}`);
  }
  console.log(
    `[dn-dispatch] Status counts: ${Object.entries(countsByStatus)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")}`
  );
  console.log(
    `[dn-dispatch] Source status counts: ${Object.entries(countsBySourceStatus)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")}`
  );
  console.log(
    `[dn-dispatch] Category counts: ${Object.entries(countsByCategory)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")}`
  );
  console.log(
    `[dn-dispatch] Permit status counts: ${Object.entries(countsByPermitStatus)
      .map(([key, value]) => `${key}=${value}`)
      .join(", ")}`
  );
  console.log(`[dn-dispatch] Output file: ${OUTPUT_FILE}`);
  console.log(`[dn-dispatch] Output runtime file: ${OUTPUT_PUBLIC_FILE}`);
  console.log(`[dn-dispatch] Output CSV: ${OUTPUT_CSV_FILE}`);
}

run();
