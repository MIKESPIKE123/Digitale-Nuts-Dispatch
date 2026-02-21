import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNlDate } from "./dateUtils";
import type { FollowUpTask, Inspector, PlannedVisit } from "../types";

type ExportInspectorPdfInput = {
  inspector: Inspector;
  dispatchDate: string;
  visits: PlannedVisit[];
  followUps: FollowUpTask[];
  routeOrderByVisitId?: Record<string, number>;
};

function visitTypeLabel(type: PlannedVisit["visitType"]): string {
  switch (type) {
    case "START":
      return "Startbezoek";
    case "EIND":
      return "Eindbezoek";
    default:
      return "Cadansbezoek";
  }
}

export function exportInspectorPdf({
  inspector,
  dispatchDate,
  visits,
  followUps,
  routeOrderByVisitId = {},
}: ExportInspectorPdfInput): void {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const title = `Opdrachtlijst toezichter ${inspector.initials}`;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Dispatchdatum: ${formatNlDate(dispatchDate)}`, 14, 23);
  doc.text(`Terreinacties: ${visits.length}`, 14, 28);
  doc.text(`Opleveringsopvolging: ${followUps.length}`, 14, 33);

  const visitRows = visits.map((visit) => [
    routeOrderByVisitId[visit.id] ? `${routeOrderByVisitId[visit.id]}. ${visit.work.dossierId}` : visit.work.dossierId,
    visitTypeLabel(visit.visitType),
    visit.work.status,
    `${visit.work.straat} ${visit.work.huisnr}, ${visit.work.postcode}`,
    formatNlDate(visit.work.startDate),
    formatNlDate(visit.work.endDate),
    visit.work.nutsBedrijf,
  ]);

  autoTable(doc, {
    startY: 38,
    head: [["Dossier", "Actie", "Status", "Adres", "Start", "Einde", "Nuts-bedrijf"]],
    body: visitRows.length > 0 ? visitRows : [["-", "-", "-", "Geen terreinacties", "-", "-", "-"]],
    styles: { fontSize: 8.4, cellPadding: 2 },
    headStyles: { fillColor: [0, 95, 115] },
  });

  const nextStartY = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 110;

  const followUpRows = followUps.map((task) => [
    task.work.dossierId,
    `${task.work.straat} ${task.work.huisnr}, ${task.work.postcode}`,
    formatNlDate(task.work.endDate),
    task.reason,
  ]);

  autoTable(doc, {
    startY: nextStartY + 8,
    head: [["Dossier", "Locatie", "Einde werf", "Actie"]],
    body:
      followUpRows.length > 0
        ? followUpRows
        : [["-", "-", "-", "Geen wekelijkse opleveringsopvolging voor deze datum"]],
    styles: { fontSize: 8.4, cellPadding: 2 },
    headStyles: { fillColor: [11, 58, 83] },
  });

  const safeDate = dispatchDate.replace(/-/g, "");
  doc.save(`opdrachtlijst_${inspector.initials}_${safeDate}.pdf`);
}
