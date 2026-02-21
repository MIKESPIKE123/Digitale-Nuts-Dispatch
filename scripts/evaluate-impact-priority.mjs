import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const WORKS_FILE = path.join(ROOT, "src", "data", "works.generated.json");
const IMPACT_FILE = path.join(ROOT, "src", "data", "impact.generated.json");
const OUTPUT_JSON = path.join(ROOT, "DATA", "impact_priority_evaluation.json");
const OUTPUT_CSV = path.join(ROOT, "DATA", "impact_priority_evaluation.csv");

const IMPACT_WEIGHTS = {
  populationDensity: 0.35,
  vulnerableShare: 0.3,
  servicePressure: 0.2,
  mobilitySensitivity: 0.15,
};
const IMPACT_DENSITY_MIN = 0;
const IMPACT_DENSITY_MAX = 15000;
const IMPACT_PRIORITY_FACTOR = 0.2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseIsoDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatIsoDate(date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffCalendarDays(a, b) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.floor((utcB - utcA) / msPerDay);
}

function normalizeDensity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < IMPACT_DENSITY_MIN) {
    return 0;
  }
  return clamp(
    (numeric - IMPACT_DENSITY_MIN) / (IMPACT_DENSITY_MAX - IMPACT_DENSITY_MIN),
    0,
    1
  );
}

function normalizeRatio(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return clamp(numeric, 0, 1);
}

function toImpactLevel(score) {
  if (score >= 70) return "HOOG";
  if (score >= 40) return "MIDDEL";
  return "LAAG";
}

function toPriorityLevel(score) {
  if (score >= 70) return "HOOG";
  if (score >= 45) return "MIDDEL";
  return "LAAG";
}

function computeImpactScore(profile) {
  if (!profile) {
    return { score: 0, level: "LAAG", delta: 0 };
  }

  const densityN = normalizeDensity(profile.populationDensity);
  const vulnerableN = normalizeRatio(profile.vulnerableShare);
  const serviceN = normalizeRatio(profile.servicePressure);
  const mobilityN = normalizeRatio(profile.mobilitySensitivity);

  const weighted =
    IMPACT_WEIGHTS.populationDensity * densityN +
    IMPACT_WEIGHTS.vulnerableShare * vulnerableN +
    IMPACT_WEIGHTS.servicePressure * serviceN +
    IMPACT_WEIGHTS.mobilitySensitivity * mobilityN;

  const score = clamp(Math.round(weighted * 100), 0, 100);
  return {
    score,
    level: toImpactLevel(score),
    delta: Math.round(score * IMPACT_PRIORITY_FACTOR),
  };
}

function computeBasePriorityScore(work, selectedDate) {
  const start = parseIsoDate(work.startDate);
  const end = parseIsoDate(work.endDate);
  const daysToEnd = diffCalendarDays(selectedDate, end);
  const daysToStart = diffCalendarDays(selectedDate, start);

  let score = 18;
  if (work.status === "VERGUND") score += 6;
  if (daysToEnd <= 3) score += 30;
  else if (daysToEnd <= 14) score += 18;
  if (daysToEnd <= 0) score += 12;
  if (work.locationSource === "postcode") score += 4;
  if (work.status === "VERGUND" && daysToStart >= 0 && daysToStart <= 7) score += 6;
  return clamp(score, 0, 100);
}

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Bestand niet gevonden: ${filePath}`);
  }
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(parsed) && typeof parsed !== "object") {
    throw new Error(`Ongeldige JSON-structuur in ${filePath}`);
  }
  return parsed;
}

function csvEscape(value) {
  const text = `${value ?? ""}`;
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function writeCsv(rows, filePath) {
  if (rows.length === 0) {
    fs.writeFileSync(filePath, "dossierId,postcode\n", "utf8");
    return;
  }

  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const works = loadJson(WORKS_FILE);
  const impactPayload = loadJson(IMPACT_FILE);
  const impactProfiles = Array.isArray(impactPayload?.profiles) ? impactPayload.profiles : [];
  const impactByPostcode = Object.fromEntries(
    impactProfiles
      .filter((profile) => profile && typeof profile.areaId === "string")
      .map((profile) => [profile.areaId, profile])
  );

  const selectedDate = process.env.IMPACT_EVAL_DATE
    ? parseIsoDate(process.env.IMPACT_EVAL_DATE)
    : parseIsoDate(formatIsoDate(new Date()));
  const selectedDateIso = formatIsoDate(selectedDate);

  const evaluationRows = works.map((work) => {
    const baseScore = computeBasePriorityScore(work, selectedDate);
    const impact = computeImpactScore(impactByPostcode[work.postcode]);
    const finalScore = clamp(baseScore + impact.delta, 0, 100);

    return {
      dossierId: work.dossierId,
      postcode: work.postcode,
      district: work.district,
      status: work.status,
      basePriorityScore: baseScore,
      finalPriorityScore: finalScore,
      deltaScore: finalScore - baseScore,
      basePriorityLevel: toPriorityLevel(baseScore),
      finalPriorityLevel: toPriorityLevel(finalScore),
      impactScore: impact.score,
      impactLevel: impact.level,
      locationSource: work.locationSource,
      nutsBedrijf: work.nutsBedrijf,
    };
  });

  const changed = evaluationRows.filter((row) => row.deltaScore !== 0);
  const promotedToHigh = evaluationRows.filter(
    (row) => row.basePriorityLevel !== "HOOG" && row.finalPriorityLevel === "HOOG"
  );
  const topShifted = [...evaluationRows]
    .sort((a, b) => {
      const absDelta = Math.abs(b.deltaScore) - Math.abs(a.deltaScore);
      if (absDelta !== 0) return absDelta;
      return b.finalPriorityScore - a.finalPriorityScore;
    })
    .slice(0, 20);

  const avgBase =
    evaluationRows.length > 0
      ? Math.round(
          evaluationRows.reduce((sum, row) => sum + row.basePriorityScore, 0) / evaluationRows.length
        )
      : 0;
  const avgFinal =
    evaluationRows.length > 0
      ? Math.round(
          evaluationRows.reduce((sum, row) => sum + row.finalPriorityScore, 0) / evaluationRows.length
        )
      : 0;

  const output = {
    generatedAt: new Date().toISOString(),
    evaluatedDate: selectedDateIso,
    totals: {
      dossiersEvaluated: evaluationRows.length,
      dossiersChanged: changed.length,
      promotedToHigh: promotedToHigh.length,
      averageBasePriorityScore: avgBase,
      averageFinalPriorityScore: avgFinal,
      averageDelta: avgFinal - avgBase,
    },
    topShifted,
    rows: evaluationRows,
  };

  fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
  fs.writeFileSync(OUTPUT_JSON, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  writeCsv(topShifted, OUTPUT_CSV);

  console.log(`[dn-dispatch] Impact evaluatie voor datum: ${selectedDateIso}`);
  console.log(`[dn-dispatch] Dossiers geëvalueerd: ${output.totals.dossiersEvaluated}`);
  console.log(`[dn-dispatch] Dossiers met scorewijziging: ${output.totals.dossiersChanged}`);
  console.log(`[dn-dispatch] Promotie naar HOOG: ${output.totals.promotedToHigh}`);
  console.log(
    `[dn-dispatch] Gemiddelde prioriteit: ${output.totals.averageBasePriorityScore} -> ${output.totals.averageFinalPriorityScore}`
  );
  console.log(`[dn-dispatch] Output JSON: ${OUTPUT_JSON}`);
  console.log(`[dn-dispatch] Output CSV (top 20 shifts): ${OUTPUT_CSV}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Onbekende fout";
  console.error(`[dn-dispatch] Impact evaluatie mislukt: ${message}`);
  process.exit(1);
}
