import { formatNlDate } from "../lib/dateUtils";
import type { ImpactLevel } from "../lib/impactScoring";
import type { FollowUpTask, Inspector, PlannedVisit } from "../types";

type InspectorBoardProps = {
  inspectors: Inspector[];
  visitsByInspector: Record<string, PlannedVisit[]>;
  followUpsByInspector: Record<string, FollowUpTask[]>;
  preferredInspectorByWorkId: Record<string, string>;
  visibleInspectorIds: Set<string>;
  absentInspectorIds: Set<string>;
  inactiveInspectorIds: Set<string>;
  selectedDate: string;
  impactByVisitId: Record<string, { level: ImpactLevel | null; score: number | null }>;
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string | null) => void;
  onExportInspectorPdf: (inspectorId: string) => void;
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

function buildASignUrl(referentieId: string): string | null {
  if (!referentieId) {
    return null;
  }
  return `https://parkeerverbod.antwerpen.be/admin/sgw/requests/${encodeURIComponent(referentieId)}`;
}

function buildGipodUrl(gipodId: string): string | null {
  const clean = (gipodId ?? "").replace(/\D/g, "");
  if (!clean) {
    return null;
  }
  return `https://gipod.vlaanderen.be/inname/${clean}`;
}

function isExternalLink(url: string | null): url is string {
  return Boolean(url);
}

export function InspectorBoard({
  inspectors,
  visitsByInspector,
  followUpsByInspector,
  preferredInspectorByWorkId,
  visibleInspectorIds,
  absentInspectorIds,
  inactiveInspectorIds,
  selectedDate,
  impactByVisitId,
  selectedVisitId,
  onSelectVisit,
  onExportInspectorPdf,
}: InspectorBoardProps) {
  const visibleInspectors = inspectors.filter((inspector) =>
    visibleInspectorIds.size === 0 ? true : visibleInspectorIds.has(inspector.id)
  );

  return (
    <div className="board-grid">
      {visibleInspectors.map((inspector) => {
        const visits = [...(visitsByInspector[inspector.id] ?? [])].sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return a.work.endDate.localeCompare(b.work.endDate);
        });

        const followUps = followUpsByInspector[inspector.id] ?? [];
        const load = visits.length;
        const isAbsent = absentInspectorIds.has(inspector.id);
        const isInactive = inactiveInspectorIds.has(inspector.id);

        return (
          <section key={inspector.id} className="inspector-column">
            <header className="inspector-header">
              <div className="inspector-header-left">
                <div className="inspector-id" style={{ borderColor: inspector.color }}>
                  {inspector.initials}
                </div>
                <div>
                  <p className="inspector-title">
                    {inspector.name || `Toezichter ${inspector.initials}`}
                  </p>
                  <p className="inspector-subtitle">
                    {isAbsent
                      ? `Afwezig op ${formatNlDate(selectedDate)} - backup/reserve ingezet`
                      : isInactive
                        ? `Niet inzetbaar op ${formatNlDate(selectedDate)} - buiten actieve termijn`
                      : `${load}/5 standaard, max 6${load > 5 ? " (overflow)" : ""}`}
                  </p>
                </div>
              </div>
              <button type="button" className="pdf-btn" onClick={() => onExportInspectorPdf(inspector.id)}>
                PDF
              </button>
            </header>

            <div className="visit-list">
              {visits.length === 0 ? (
                <p className="muted">Geen terreinacties voor deze datum.</p>
              ) : (
                visits.map((visit) => (
                  (() => {
                    const aSignUrl = buildASignUrl(visit.work.referentieId);
                    const gipodUrl = buildGipodUrl(visit.work.gipodId);
                    const impact = impactByVisitId[visit.id];
                    return (
                  <button
                    key={visit.id}
                    type="button"
                    className={`visit-card ${visit.mandatory ? "mandatory" : "cadence"}`}
                    onClick={() => onSelectVisit(visit.id)}
                    aria-pressed={selectedVisitId === visit.id}
                    data-selected={selectedVisitId === visit.id}
                  >
                    <div className="visit-topline">
                      <strong>{visit.work.dossierId}</strong>
                      <div className="visit-topline-chips">
                        <span className="visit-chip">{visitTypeLabel(visit.visitType)}</span>
                        {impact?.level ? (
                          <span className={`visit-chip impact-${impact.level.toLowerCase()}`}>
                            Impact {impact.level} ({impact.score ?? "-"})
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <p>
                      {visit.work.straat} {visit.work.huisnr} ({visit.work.postcode})
                    </p>
                    <div className="visit-meta-row">
                      <span>ReferentieID:</span>
                      {isExternalLink(aSignUrl) ? (
                        <a href={aSignUrl} target="_blank" rel="noreferrer">
                          {visit.work.referentieId || "-"}
                        </a>
                      ) : (
                        <span>{visit.work.referentieId || "-"}</span>
                      )}
                    </div>
                    <div className="visit-meta-row">
                      <span>GIPOD:</span>
                      {isExternalLink(gipodUrl) ? (
                        <a href={gipodUrl} target="_blank" rel="noreferrer">
                          {visit.work.gipodId || "-"}
                        </a>
                      ) : (
                        <span>{visit.work.gipodId || "-"}</span>
                      )}
                    </div>
                    <p className="visit-meta">
                      {visit.work.status} | {visit.work.nutsBedrijf}
                    </p>
                    <p className="visit-meta">
                      GIPOD: {visit.work.sourceStatus || "-"} | {visit.work.gipodCategorie || "-"}
                    </p>
                    <p className="visit-meta">
                      Vergunning: {visit.work.permitStatus || "ONBEKEND"}
                    </p>
                    {visit.work.status === "VERGUND" ? (
                      <p className="visit-meta">Start voorzien: {formatNlDate(visit.work.startDate)}</p>
                    ) : (
                      <p className="visit-meta">In uitvoering sinds: {formatNlDate(visit.work.startDate)}</p>
                    )}
                    <p className="visit-meta">Loopt t.e.m.: {formatNlDate(visit.work.endDate)}</p>
                    <p className="visit-meta">
                      {preferredInspectorByWorkId[visit.work.id] === inspector.id
                        ? "Voorkeurtoezichter"
                        : "Tijdelijke herverdeling"}
                    </p>
                  </button>
                    );
                  })()
                ))
              )}
            </div>

            <div className="followup-block">
              <p className="followup-title">Opleveringsopvolging (mail/telefoon)</p>
              {followUps.length === 0 ? (
                <p className="muted">Geen follow-up taken vandaag.</p>
              ) : (
                followUps.map((task) => (
                  <article key={task.id} className="followup-card">
                    <strong>{task.work.dossierId}</strong>
                    <span>
                      einde {formatNlDate(task.work.endDate)} | {task.work.postcode}
                    </span>
                  </article>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
