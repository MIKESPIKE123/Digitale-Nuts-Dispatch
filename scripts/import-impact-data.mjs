import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORKS_INPUT_FILE = path.join(ROOT, "src", "data", "works.generated.json");
const OUTPUT_FILE = path.join(ROOT, "src", "data", "impact.generated.json");
const OUTPUT_PUBLIC_FILE = path.join(ROOT, "public", "data", "impact.generated.json");

const LAYERS = {
  populationDensityWijk:
    "https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek9/MapServer/867",
  shortageGreenBuurt:
    "https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek12/MapServer/89",
  shortageServiceWijk:
    "https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek12/MapServer/94",
  flaneerzone:
    "https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek8/MapServer/845",
  parkingTariffZone:
    "https://geodata.antwerpen.be/arcgissql/rest/services/P_Portal/portal_publiek3/MapServer/212",
};

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

function normalize(value) {
  return `${value ?? ""}`.trim();
}

function toIsoDateFromEpoch(value) {
  const epoch = Number(value);
  if (!Number.isFinite(epoch) || epoch <= 0) {
    return null;
  }
  const date = new Date(epoch);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const y = date.getUTCFullYear();
  const m = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const d = `${date.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeTariffColor(value) {
  const color = normalize(value).toLowerCase();
  if (!color) {
    return null;
  }
  if (color.includes("rood")) return "ROOD";
  if (color.includes("oranje")) return "ORANJE";
  if (color.includes("groen")) return "GROEN";
  if (color.includes("blauw")) return "BLAUW";
  return color.toUpperCase();
}

function normalizeDensity(value) {
  const density = Number(value);
  if (!Number.isFinite(density) || density < 0) {
    return null;
  }
  return Math.round(density);
}

function toMobilitySensitivity({ inFlaneerzone, tariffColor }) {
  if (inFlaneerzone) {
    return 1;
  }
  if (tariffColor === "ROOD") {
    return 0.9;
  }
  if (tariffColor === "ORANJE") {
    return 0.75;
  }
  if (tariffColor === "GROEN") {
    return 0.45;
  }
  if (tariffColor === "BLAUW") {
    return 0.3;
  }
  return 0;
}

async function queryArcGisPointLayer(url, point, outFields) {
  const params = new URLSearchParams({
    f: "json",
    where: "1=1",
    outFields,
    returnGeometry: "false",
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    geometry: JSON.stringify({ x: point.lng, y: point.lat }),
  });

  const response = await fetch(`${url}/query?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Layer query failed (${response.status}) for ${url}`);
  }

  const payload = await response.json();
  if (payload.error) {
    const message = normalize(payload.error.message || "Onbekende ArcGIS queryfout");
    throw new Error(`${message} (${url})`);
  }

  return Array.isArray(payload.features) ? payload.features : [];
}

function readWorks() {
  if (!fs.existsSync(WORKS_INPUT_FILE)) {
    throw new Error(
      `Werkenbestand ontbreekt: ${WORKS_INPUT_FILE}. Run eerst 'npm run import:data'.`
    );
  }

  const parsed = JSON.parse(fs.readFileSync(WORKS_INPUT_FILE, "utf8"));
  if (!Array.isArray(parsed)) {
    throw new Error("works.generated.json heeft geen geldige lijststructuur.");
  }
  return parsed;
}

function buildDistrictMap(works) {
  const perPostcode = new Map();

  for (const work of works) {
    const postcode = normalize(work.postcode);
    const district = normalize(work.district);
    if (!postcode) {
      continue;
    }
    if (!perPostcode.has(postcode)) {
      perPostcode.set(postcode, new Map());
    }
    if (!district) {
      continue;
    }
    const counts = perPostcode.get(postcode);
    counts.set(district, (counts.get(district) ?? 0) + 1);
  }

  const districtByPostcode = new Map();

  for (const [postcode, counts] of perPostcode.entries()) {
    const ordered = [...counts.entries()].sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0], "nl");
    });
    districtByPostcode.set(postcode, ordered[0]?.[0] ?? null);
  }

  return districtByPostcode;
}

function buildWorkCountMap(works) {
  const counts = new Map();

  for (const work of works) {
    const postcode = normalize(work.postcode);
    if (!postcode) {
      continue;
    }
    counts.set(postcode, (counts.get(postcode) ?? 0) + 1);
  }

  return counts;
}

function fallbackProfile(postcode, district, worksCount) {
  return {
    areaId: postcode,
    areaLabel: `Postcode ${postcode}`,
    district: district ?? null,
    worksCount,
    asOfDate: null,
    sourceAreaId: null,
    sourceAreaLabel: null,
    populationDensity: null,
    vulnerableShare: null,
    servicePressure: null,
    mobilitySensitivity: null,
    indicators: {
      inShortageGreenZone: false,
      inShortageServiceZone: false,
      inFlaneerzone: false,
      parkingTariffColor: null,
      parkingZoneCode: null,
      parkingZoneName: null,
    },
  };
}

async function buildImpactProfiles() {
  const works = readWorks();
  const districtByPostcode = buildDistrictMap(works);
  const workCountByPostcode = buildWorkCountMap(works);

  const postcodes = [...new Set(works.map((work) => normalize(work.postcode)).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "nl", { numeric: true }));

  const profiles = [];
  let fallbackCount = 0;

  for (const postcode of postcodes) {
    const district = districtByPostcode.get(postcode) ?? null;
    const worksCount = workCountByPostcode.get(postcode) ?? 0;
    const centroid = POSTCODE_CENTROIDS[postcode];

    if (!centroid) {
      profiles.push(fallbackProfile(postcode, district, worksCount));
      fallbackCount += 1;
      continue;
    }

    try {
      const [
        densityFeatures,
        shortageGreenFeatures,
        shortageServiceFeatures,
        flaneerFeatures,
        parkingFeatures,
      ] = await Promise.all([
        queryArcGisPointLayer(
          LAYERS.populationDensityWijk,
          centroid,
          "WIJKCODE,WIJKNAAM,BEVOLKINGSDICHTHEID,DATUM"
        ),
        queryArcGisPointLayer(LAYERS.shortageGreenBuurt, centroid, "*"),
        queryArcGisPointLayer(LAYERS.shortageServiceWijk, centroid, "*"),
        queryArcGisPointLayer(LAYERS.flaneerzone, centroid, "NAAM,POSTCODE"),
        queryArcGisPointLayer(LAYERS.parkingTariffZone, centroid, "TARIEFZONE,TARIEFKLEUR,NAAM"),
      ]);

      const density = densityFeatures[0]?.attributes ?? null;
      const parking = parkingFeatures[0]?.attributes ?? null;

      const inShortageGreenZone = shortageGreenFeatures.length > 0;
      const inShortageServiceZone = shortageServiceFeatures.length > 0;
      const inFlaneerzone = flaneerFeatures.length > 0;
      const parkingTariffColor = normalizeTariffColor(parking?.TARIEFKLEUR ?? parking?.tariefkleur);

      profiles.push({
        areaId: postcode,
        areaLabel: `Postcode ${postcode}`,
        district,
        worksCount,
        asOfDate: toIsoDateFromEpoch(density?.DATUM ?? density?.datum),
        sourceAreaId: normalize(density?.WIJKCODE ?? density?.wijkcode) || null,
        sourceAreaLabel: normalize(density?.WIJKNAAM ?? density?.wijknaam) || null,
        populationDensity: normalizeDensity(density?.BEVOLKINGSDICHTHEID),
        vulnerableShare: inShortageServiceZone ? 1 : 0,
        servicePressure: inShortageGreenZone ? 1 : 0,
        mobilitySensitivity: toMobilitySensitivity({ inFlaneerzone, tariffColor: parkingTariffColor }),
        indicators: {
          inShortageGreenZone,
          inShortageServiceZone,
          inFlaneerzone,
          parkingTariffColor,
          parkingZoneCode: normalize(parking?.TARIEFZONE ?? parking?.tariefzone) || null,
          parkingZoneName: normalize(parking?.NAAM ?? parking?.naam) || null,
        },
      });
    } catch (error) {
      fallbackCount += 1;
      const fallback = fallbackProfile(postcode, district, worksCount);
      fallback.indicators.error = error instanceof Error ? error.message : "Onbekende fout";
      profiles.push(fallback);
    }
  }

  const densityValues = profiles
    .map((profile) => profile.populationDensity)
    .filter((value) => Number.isFinite(value));

  const output = {
    generatedAt: new Date().toISOString(),
    source: {
      project: "DIGITALE NUTS - DN_DISPATCH",
      method: "Open API verrijking op postcodecentroid (Antwerpen Open Geoportaal)",
      layers: LAYERS,
    },
    summary: {
      totalProfiles: profiles.length,
      fallbackProfiles: fallbackCount,
      profilesWithDensity: densityValues.length,
      minDensity: densityValues.length > 0 ? Math.min(...densityValues) : null,
      maxDensity: densityValues.length > 0 ? Math.max(...densityValues) : null,
    },
    profiles,
  };

  return output;
}

function writeJson(targetPath, value) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const output = await buildImpactProfiles();

  writeJson(OUTPUT_FILE, output);
  writeJson(OUTPUT_PUBLIC_FILE, output);

  console.log(`[dn-dispatch] Impact profiles: ${output.summary.totalProfiles}`);
  console.log(`[dn-dispatch] Fallback profiles: ${output.summary.fallbackProfiles}`);
  console.log(
    `[dn-dispatch] Density range: ${
      output.summary.minDensity ?? "-"
    } .. ${output.summary.maxDensity ?? "-"}`
  );
  console.log(`[dn-dispatch] Output file: ${OUTPUT_FILE}`);
  console.log(`[dn-dispatch] Output runtime file: ${OUTPUT_PUBLIC_FILE}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "Onbekende fout";
  console.error(`[dn-dispatch] Impact import failed: ${message}`);
  process.exit(1);
});
