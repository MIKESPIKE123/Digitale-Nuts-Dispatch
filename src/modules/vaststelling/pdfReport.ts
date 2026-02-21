import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  DNVaststellingFieldValue,
  DNVaststellingPhotoFieldKey,
  DNVaststellingRecord,
  DNVaststellingValidationResult,
} from "./contracts";
import type { ParsedSchema } from "./schema";
import { buildNokSummaryRows, buildVaststellingReportRows } from "./reportModel";
import { calculateChecklistScore } from "./checklistScore";

type ExportDNVaststellingPdfInput = {
  record: DNVaststellingRecord;
  schema: ParsedSchema;
  validation?: DNVaststellingValidationResult | null;
};

type ReportPhotoCard = {
  fieldKey: DNVaststellingPhotoFieldKey;
  label: string;
  url: string;
  takenAt?: string;
  source?: string;
  hash?: string;
};

type PhotoEvidenceMeta = {
  url: string;
  takenAt: string;
  source: string;
  hash: string;
};

const PHOTO_FIELDS: Array<{ fieldKey: DNVaststellingPhotoFieldKey; label: string }> = [
  { fieldKey: "fotoVoor_url", label: "Foto VOOR" },
  { fieldKey: "fotoDetail_url", label: "Foto DETAIL" },
  { fieldKey: "fotoNa_url", label: "Foto NA" },
];
const PHOTO_CARD_WIDTH = 88;
const PHOTO_CARD_HEIGHT = 64;
const PAGE_BOTTOM_Y = 282;
const NEW_PAGE_START_Y = 18;

function getFormData(record: DNVaststellingRecord): Record<string, DNVaststellingFieldValue> {
  const raw = record.mutablePayload.formData;
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const parsed: Record<string, DNVaststellingFieldValue> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") {
      parsed[key] = value;
      continue;
    }
    if (Array.isArray(value) && value.every((entry) => typeof entry === "string")) {
      parsed[key] = value;
    }
  }

  return parsed;
}

function isPhotoFieldKey(value: string): value is DNVaststellingPhotoFieldKey {
  return value === "fotoVoor_url" || value === "fotoDetail_url" || value === "fotoNa_url";
}

function photoFieldLabel(fieldKey: DNVaststellingPhotoFieldKey): string {
  return PHOTO_FIELDS.find((item) => item.fieldKey === fieldKey)?.label ?? fieldKey;
}

function compactPhotoUrl(url: string): string {
  const trimmed = url.trim();
  if (/^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(trimmed)) {
    return "[embedded data-image]";
  }
  if (trimmed.length <= 88) {
    return trimmed;
  }
  return `${trimmed.slice(0, 85)}...`;
}

function isPhotoFieldLabel(value: string): boolean {
  return value === "Foto VOOR" || value === "Foto DETAIL" || value === "Foto NA";
}

function sanitizeTableDescription(fieldLabel: string, description: string): string {
  const trimmed = description.trim();

  if (isPhotoFieldLabel(fieldLabel)) {
    return "Foto toegevoegd (zie sectie 'Ingesloten foto's').";
  }

  if (/data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(trimmed)) {
    return "Afbeeldingsdata aanwezig (zie sectie 'Ingesloten foto's').";
  }

  if (trimmed.length > 260) {
    return `${trimmed.slice(0, 257)}...`;
  }

  return trimmed;
}

function getPhotoEvidenceRows(record: DNVaststellingRecord): string[][] {
  const raw = Array.isArray(record.mutablePayload.photoEvidence)
    ? (record.mutablePayload.photoEvidence as unknown[])
    : [];
  const rows: string[][] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const data = item as Record<string, unknown>;
    if (
      typeof data.fieldKey !== "string" ||
      typeof data.url !== "string" ||
      typeof data.takenAt !== "string" ||
      typeof data.hash !== "string" ||
      typeof data.source !== "string"
    ) {
      continue;
    }
    if (!isPhotoFieldKey(data.fieldKey)) {
      continue;
    }
    rows.push([
      photoFieldLabel(data.fieldKey),
      compactPhotoUrl(data.url),
      formatDateTime(data.takenAt),
      data.source,
      data.hash,
    ]);
  }

  return rows;
}

function getPhotoEvidenceMetaByField(record: DNVaststellingRecord): Partial<
  Record<DNVaststellingPhotoFieldKey, PhotoEvidenceMeta>
> {
  const raw = Array.isArray(record.mutablePayload.photoEvidence)
    ? (record.mutablePayload.photoEvidence as unknown[])
    : [];

  const metaByField: Partial<Record<DNVaststellingPhotoFieldKey, PhotoEvidenceMeta>> = {};
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const data = item as Record<string, unknown>;
    if (
      typeof data.fieldKey !== "string" ||
      !isPhotoFieldKey(data.fieldKey) ||
      typeof data.url !== "string" ||
      typeof data.takenAt !== "string" ||
      typeof data.hash !== "string" ||
      typeof data.source !== "string"
    ) {
      continue;
    }

    metaByField[data.fieldKey] = {
      url: data.url,
      takenAt: data.takenAt,
      source: data.source,
      hash: data.hash,
    };
  }

  return metaByField;
}

function getReportPhotoCards(
  record: DNVaststellingRecord,
  formData: Record<string, DNVaststellingFieldValue>
): ReportPhotoCard[] {
  const metaByField = getPhotoEvidenceMetaByField(record);
  const cards: ReportPhotoCard[] = [];

  for (const field of PHOTO_FIELDS) {
    const formValue = formData[field.fieldKey];
    const formUrl = typeof formValue === "string" ? formValue.trim() : "";
    const evidenceMeta = metaByField[field.fieldKey];
    const resolvedUrl = formUrl || evidenceMeta?.url || "";
    if (!resolvedUrl) {
      continue;
    }

    cards.push({
      fieldKey: field.fieldKey,
      label: field.label,
      url: resolvedUrl,
      takenAt: evidenceMeta?.takenAt,
      source: evidenceMeta?.source,
      hash: evidenceMeta?.hash,
    });
  }

  return cards;
}

function isEmbeddableDataImageUrl(url: string): boolean {
  return /^data:image\/(?:png|jpeg|jpg|webp);base64,/i.test(url.trim());
}

function resolveImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
  const normalized = dataUrl.slice(0, 48).toLowerCase();
  if (normalized.includes("image/png")) {
    return "PNG";
  }
  if (normalized.includes("image/webp")) {
    return "WEBP";
  }
  return "JPEG";
}

function ensurePageSpace(doc: jsPDF, y: number, neededHeight: number): number {
  if (y + neededHeight <= PAGE_BOTTOM_Y) {
    return y;
  }

  doc.addPage();
  return NEW_PAGE_START_Y;
}

function drawPhotoPlaceholder(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  message: string
): void {
  doc.setDrawColor(206, 215, 223);
  doc.rect(x, y, width, height);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(message, x + 2, y + 6, { maxWidth: width - 4 });
}

function drawPhotoCard(doc: jsPDF, x: number, y: number, photo: ReportPhotoCard): void {
  doc.setDrawColor(198, 210, 220);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, PHOTO_CARD_WIDTH, PHOTO_CARD_HEIGHT, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.3);
  doc.setTextColor(15, 23, 42);
  doc.text(photo.label, x + 2, y + 5.5);

  const imageX = x + 2;
  const imageY = y + 7;
  const imageWidth = PHOTO_CARD_WIDTH - 4;
  const imageHeight = 41;

  if (isEmbeddableDataImageUrl(photo.url)) {
    try {
      doc.addImage(photo.url, resolveImageFormat(photo.url), imageX, imageY, imageWidth, imageHeight, undefined, "FAST");
    } catch {
      drawPhotoPlaceholder(doc, imageX, imageY, imageWidth, imageHeight, "Kon afbeelding niet renderen.");
    }
  } else {
    drawPhotoPlaceholder(doc, imageX, imageY, imageWidth, imageHeight, "Niet ingesloten: geen data-image URL.");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.1);
  doc.setTextColor(71, 85, 105);
  doc.text(`Tijdstip: ${photo.takenAt ? formatDateTime(photo.takenAt) : "-"}`, x + 2, y + 52);
  doc.text(`Bron: ${photo.source ?? "-"}`, x + 2, y + 56);
  doc.text(`Hash: ${photo.hash ? photo.hash.slice(0, 18) : "-"}`, x + 2, y + 60);
}

function drawPhotoSection(doc: jsPDF, startY: number, photos: ReportPhotoCard[]): number {
  let y = ensurePageSpace(doc, startY, 12);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("Ingesloten foto's", 14, y);

  if (photos.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.4);
    doc.setTextColor(71, 85, 105);
    doc.text("Geen foto-URL's beschikbaar om in te sluiten.", 14, y + 5);
    return y + 7;
  }

  y += 4;
  for (let index = 0; index < photos.length; index += 2) {
    y = ensurePageSpace(doc, y, PHOTO_CARD_HEIGHT + 2);
    drawPhotoCard(doc, 14, y, photos[index]);
    if (photos[index + 1]) {
      drawPhotoCard(doc, 108, y, photos[index + 1]);
    }
    y += PHOTO_CARD_HEIGHT + 4;
  }

  return y - 2;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateOnly(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("nl-BE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function completionStateLabel(state: DNVaststellingRecord["completionState"]): string {
  switch (state) {
    case "draft":
      return "Draft";
    case "valid":
      return "Valid";
    case "queued":
      return "In wachtrij";
    default:
      return "Gesynct";
  }
}

function sanitizeFilenamePart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, "_");
}

function drawFooter(doc: jsPDF, inspectorName: string, createdAt: string): void {
  const totalPages = doc.getNumberOfPages();
  const footerText = `Verslag opgemaakt op ${formatDateOnly(createdAt)} door ${inspectorName}`;

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(85, 85, 85);
    doc.text(footerText, 14, 289);
    doc.text(`${page} / ${totalPages}`, 196, 289, { align: "right" });
  }
}

export function exportDNVaststellingPdf({
  record,
  schema,
  validation,
}: ExportDNVaststellingPdfInput): void {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const formData = getFormData(record);
  const checklistScore =
    typeof record.mutablePayload.checklistScore === "number"
      ? Math.round(record.mutablePayload.checklistScore)
      : calculateChecklistScore(formData).score;
  const rows = buildVaststellingReportRows(schema, formData);
  const nokRows = buildNokSummaryRows(rows);
  const photoEvidenceRows = getPhotoEvidenceRows(record);
  const reportPhotoCards = getReportPhotoCards(record, formData);
  const context = record.immutableContext;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text("Stad Antwerpen", 14, 15);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Stadsontwikkeling Publieke Ruimte", 14, 21);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Rapport vaststelling nuts", 14, 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Nummer: ${context.bonuNummer || "-"}`, 140, 15);
  doc.text(`Datum: ${formatDateTime(record.createdAt)}`, 140, 21);
  doc.text(`Opgemaakt op: ${new Date().toISOString().slice(0, 10)}`, 140, 27);

  doc.setDrawColor(210, 210, 210);
  doc.line(14, 31.5, 196, 31.5);

  autoTable(doc, {
    startY: 36,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 1.2,
      textColor: [28, 28, 28],
    },
    columnStyles: {
      0: { cellWidth: 44, fontStyle: "bold" },
      1: { cellWidth: 138 },
    },
    body: [
      ["Dossier", context.dossierId || "-"],
      ["Adres", `${context.straat} ${context.huisnr}, ${context.postcode} ${context.district}`],
      ["Nutsmaatschappij", context.nutsBedrijf || "-"],
      ["Referentie/GW", context.referentieId || "-"],
      ["GIPOD", context.gipodId || "-"],
      ["Toezichter", record.inspectorSession.inspectorName],
      ["Status record", completionStateLabel(record.completionState)],
      ["Handover", record.mutablePayload.handoverDecision || "Geen keuze"],
    ],
  });

  const introStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 62;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.4);
  const introText =
    "Naar aanleiding van de uitgevoerde nutswerken en het herstel van de bestrating in de openbare ruimte, worden onderstaande vaststellingen en eventuele NOK-items opgesomd voor opvolging en remediatie.";
  doc.text(introText, 14, introStartY + 8, { maxWidth: 182 });

  const metricsY = introStartY + 19;
  doc.setFontSize(9.2);
  doc.text(
    `Checklistscore: ${checklistScore}/100  |  NOK-items: ${nokRows.length}  |  Totaal ingevulde vaststellingen: ${rows.length}  |  Validatie issues: ${
      validation ? validation.issues.length : "-"
    }`,
    14,
    metricsY
  );

  const rowBody = rows.map((row) => {
    const safeDescription = sanitizeTableDescription(row.fieldLabel, row.description);
    return [
      row.status === "INFO" ? row.sectionTitle : `${row.sectionTitle} ${row.status}`,
      row.fieldLabel,
      safeDescription,
      formatDateTime(record.updatedAt),
    ];
  });
  const photoSectionEndY = drawPhotoSection(doc, metricsY + 5, reportPhotoCards);

  autoTable(doc, {
    startY: photoSectionEndY + 6,
    head: [["Vaststelling", "Opmerking", "Omschrijving", "Tijdstip"]],
    body:
      rowBody.length > 0
        ? rowBody
        : [["-", "-", "Geen ingevulde vaststellingen in dit record.", formatDateTime(record.updatedAt)]],
    styles: {
      font: "helvetica",
      fontSize: 8.4,
      cellPadding: 1.8,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [0, 95, 115],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 46 },
      1: { cellWidth: 42 },
      2: { cellWidth: 72 },
      3: { cellWidth: 26 },
    },
  });

  const evidenceStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 180;
  autoTable(doc, {
    startY: evidenceStartY + 8,
    head: [["Foto evidence", "URL", "Tijdstip", "Bron", "Hash"]],
    body:
      photoEvidenceRows.length > 0
        ? photoEvidenceRows
        : [["-", "-", "-", "-", "Geen foto-evidence toegevoegd."]],
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 1.6,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [8, 77, 93],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 24 },
      1: { cellWidth: 86 },
      2: { cellWidth: 24 },
      3: { cellWidth: 16 },
      4: { cellWidth: 32 },
    },
  });

  const summaryStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 220;
  autoTable(doc, {
    startY: summaryStartY + 6,
    head: [["Samenvatting opmerkingen", "Type", "Detail"]],
    body:
      nokRows.length > 0
        ? nokRows.map((row) => {
            const safeDescription = sanitizeTableDescription(row.fieldLabel, row.description);
            return [row.sectionTitle, "NOT OK", `${row.fieldLabel}: ${safeDescription}`];
          })
        : [["-", "INFO", "Geen NOK-opmerkingen in dit record."]],
    styles: {
      font: "helvetica",
      fontSize: 8.3,
      cellPadding: 1.8,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: [11, 58, 83],
      textColor: [255, 255, 255],
    },
    columnStyles: {
      0: { cellWidth: 56 },
      1: { cellWidth: 22 },
      2: { cellWidth: 104 },
    },
  });

  const disclaimerStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 240;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.4);
  doc.text(
    "Deze rapportering is bedoeld voor operationele opvolging van vaststellingen binnen DN Dispatch. Gegevens worden beheerd volgens de geldende governance- en privacyafspraken.",
    14,
    disclaimerStartY + 8,
    { maxWidth: 182 }
  );

  drawFooter(doc, record.inspectorSession.inspectorName, record.createdAt);

  const safeBonu = sanitizeFilenamePart(context.bonuNummer || context.dossierId || "vaststelling");
  const safeDate = sanitizeFilenamePart(record.createdAt.slice(0, 10));
  doc.save(`dn_vaststelling_${safeBonu}_${safeDate}.pdf`);
}
