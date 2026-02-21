import { useMemo, useState } from "react";
import { addDays, diffCalendarDays, formatNlDate, parseIsoDate } from "../lib/dateUtils";
import type { Inspector, WorkRecord, WorkStatus } from "../types";

type TimelineViewProps = {
  works: WorkRecord[];
  inspectors: Inspector[];
  selectedDate: string;
  preferredInspectorByWorkId: Record<string, string>;
};

type TimelineWindow = "90" | "180" | "all";

type TimelineRow = {
  work: WorkRecord;
  preferredInspector: Inspector | null;
  riskLevel: "laag" | "middel" | "hoog";
  daysToEnd: number;
  actualStart: string | null;
  actualEnd: string | null;
};

const STATUS_OPTIONS: WorkStatus[] = ["VERGUND", "IN EFFECT"];

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function overlap(rangeStart: Date, rangeEnd: Date, itemStart: Date, itemEnd: Date): boolean {
  return itemEnd >= rangeStart && itemStart <= rangeEnd;
}

function computeRisk(status: WorkStatus, daysToEnd: number): TimelineRow["riskLevel"] {
  if (daysToEnd < 0) {
    return "hoog";
  }

  if (status === "IN EFFECT" && daysToEnd <= 3) {
    return "hoog";
  }

  if (daysToEnd <= 7) {
    return "middel";
  }

  return "laag";
}

function getWindowBounds(
  rows: WorkRecord[],
  selectedDate: string,
  window: TimelineWindow
): { rangeStart: Date; rangeEnd: Date } | null {
  if (rows.length === 0) {
    return null;
  }

  if (window === "all") {
    const starts = rows.map((work) => parseIsoDate(work.startDate).getTime());
    const ends = rows.map((work) => parseIsoDate(work.endDate).getTime());
    return {
      rangeStart: new Date(Math.min(...starts)),
      rangeEnd: new Date(Math.max(...ends)),
    };
  }

  const start = addDays(parseIsoDate(selectedDate), -14);
  const end = addDays(start, Number(window));
  return { rangeStart: start, rangeEnd: end };
}

function toPct(dateIso: string, rangeStart: Date, totalDays: number): number {
  const dayOffset = diffCalendarDays(rangeStart, parseIsoDate(dateIso));
  return clamp((dayOffset / totalDays) * 100, 0, 100);
}

function toBar(
  startIso: string,
  endIso: string,
  rangeStart: Date,
  rangeEnd: Date,
  totalDays: number
): { left: number; width: number } {
  const itemStart = parseIsoDate(startIso);
  const itemEnd = parseIsoDate(endIso);
  const clippedStart = itemStart < rangeStart ? rangeStart : itemStart;
  const clippedEnd = itemEnd > rangeEnd ? rangeEnd : itemEnd;

  const startPct = toPct(
    `${clippedStart.getFullYear()}-${`${clippedStart.getMonth() + 1}`.padStart(2, "0")}-${`${clippedStart.getDate()}`.padStart(2, "0")}`,
    rangeStart,
    totalDays
  );
  const endPct = toPct(
    `${clippedEnd.getFullYear()}-${`${clippedEnd.getMonth() + 1}`.padStart(2, "0")}-${`${clippedEnd.getDate()}`.padStart(2, "0")}`,
    rangeStart,
    totalDays
  );

  return {
    left: startPct,
    width: clamp(endPct - startPct + 0.8, 0.8, 100),
  };
}

export function TimelineView({
  works,
  inspectors,
  selectedDate,
  preferredInspectorByWorkId,
}: TimelineViewProps) {
  const [window, setWindow] = useState<TimelineWindow>("180");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<WorkStatus[]>([...STATUS_OPTIONS]);
  const [inspectorFilter, setInspectorFilter] = useState<string>("all");

  const inspectorById = useMemo(
    () => Object.fromEntries(inspectors.map((inspector) => [inspector.id, inspector])),
    [inspectors]
  );

  const filteredRows = useMemo(() => {
    const statusSet = new Set(statusFilter);
    const q = query.trim().toLowerCase();

    const rows = works
      .filter((work) => statusSet.has(work.status))
      .filter((work) => {
        if (inspectorFilter === "all") {
          return true;
        }
        return preferredInspectorByWorkId[work.id] === inspectorFilter;
      })
      .filter((work) => {
        if (!q) {
          return true;
        }
        const haystack =
          `${work.dossierId} ${work.referentieId} ${work.gipodId} ${work.straat} ${work.postcode} ${work.district} ${work.nutsBedrijf}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        if (a.startDate !== b.startDate) {
          return a.startDate.localeCompare(b.startDate);
        }
        return a.dossierId.localeCompare(b.dossierId);
      });

    return rows;
  }, [inspectorFilter, preferredInspectorByWorkId, query, statusFilter, works]);

  const bounds = useMemo(
    () => getWindowBounds(filteredRows, selectedDate, window),
    [filteredRows, selectedDate, window]
  );

  const timelineRows = useMemo(() => {
    if (!bounds) {
      return [] as TimelineRow[];
    }

    const now = parseIsoDate(selectedDate);
    return filteredRows
      .filter((work) =>
        overlap(bounds.rangeStart, bounds.rangeEnd, parseIsoDate(work.startDate), parseIsoDate(work.endDate))
      )
      .map((work) => {
        const daysToEnd = diffCalendarDays(now, parseIsoDate(work.endDate));
        const preferredInspector = inspectorById[preferredInspectorByWorkId[work.id] ?? ""] ?? null;
        const actualStart = work.status === "IN EFFECT" ? work.startDate : null;
        const actualEnd =
          work.status === "IN EFFECT" && now >= parseIsoDate(work.startDate)
            ? now > parseIsoDate(work.endDate)
              ? work.endDate
              : selectedDate
            : null;

        return {
          work,
          preferredInspector,
          riskLevel: computeRisk(work.status, daysToEnd),
          daysToEnd,
          actualStart,
          actualEnd,
        };
      });
  }, [bounds, filteredRows, inspectorById, preferredInspectorByWorkId, selectedDate]);

  const totalDays = useMemo(() => {
    if (!bounds) {
      return 1;
    }
    return Math.max(1, diffCalendarDays(bounds.rangeStart, bounds.rangeEnd) + 1);
  }, [bounds]);

  const selectedDatePct = useMemo(() => {
    if (!bounds) {
      return 0;
    }
    return toPct(selectedDate, bounds.rangeStart, totalDays);
  }, [bounds, selectedDate, totalDays]);

  const counts = useMemo(() => {
    const total = timelineRows.length;
    const inEffect = timelineRows.filter((row) => row.work.status === "IN EFFECT").length;
    const highRisk = timelineRows.filter((row) => row.riskLevel === "hoog").length;
    return { total, inEffect, highRisk };
  }, [timelineRows]);

  return (
    <main className="view-shell timeline-shell">
      <section className="view-card timeline-header-card">
        <h2>Tijdlijn (live)</h2>
        <p className="view-subtitle">
          Eerste live versie: Gantt-planning op basis van start/einddatum met risicoduiding en filtercontext.
        </p>
      </section>

      <div className="timeline-layout">
        <aside className="view-card timeline-sidebar">
          <section className="timeline-sidebar-block">
            <h3>Overzicht</h3>
            <div className="timeline-stats-grid">
              <article className="timeline-kpi">
                <span className="stat-label">In venster</span>
                <strong>{counts.total}</strong>
              </article>
              <article className="timeline-kpi">
                <span className="stat-label">IN EFFECT</span>
                <strong>{counts.inEffect}</strong>
              </article>
              <article className="timeline-kpi">
                <span className="stat-label">Hoog risico</span>
                <strong>{counts.highRisk}</strong>
              </article>
              <article className="timeline-kpi">
                <span className="stat-label">Referentiedatum</span>
                <strong>{formatNlDate(selectedDate)}</strong>
              </article>
            </div>
          </section>

          <section className="timeline-sidebar-block">
            <h3>Filters</h3>
            <div className="timeline-toolbar">
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Zoek dossier, straat, referentie, GIPOD..."
              />
              <select
                value={inspectorFilter}
                onChange={(event) => setInspectorFilter(event.target.value)}
                aria-label="Filter op voorkeurtoezichter"
              >
                <option value="all">Alle toezichters</option>
                {inspectors.map((inspector) => (
                  <option key={inspector.id} value={inspector.id}>
                    {inspector.initials} - {inspector.name ?? inspector.id}
                  </option>
                ))}
              </select>
              <div className="chip-wrap">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={statusFilter.includes(status) ? "chip active" : "chip"}
                    onClick={() =>
                      setStatusFilter((previous) =>
                        previous.includes(status)
                          ? previous.filter((item) => item !== status)
                          : [...previous, status]
                      )
                    }
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="chip-wrap">
                <button
                  type="button"
                  className={window === "90" ? "chip active" : "chip"}
                  onClick={() => setWindow("90")}
                >
                  90d
                </button>
                <button
                  type="button"
                  className={window === "180" ? "chip active" : "chip"}
                  onClick={() => setWindow("180")}
                >
                  180d
                </button>
                <button
                  type="button"
                  className={window === "all" ? "chip active" : "chip"}
                  onClick={() => setWindow("all")}
                >
                  Alles
                </button>
              </div>
            </div>
          </section>

          <section className="timeline-sidebar-block">
            <details className="timeline-legend">
              <summary className="timeline-legend-summary">Legenda tijdlijn</summary>
              <div className="timeline-legend-items" role="list" aria-label="Legenda tijdlijn">
                <span className="timeline-legend-item" role="listitem">
                  <span className="timeline-legend-line baseline" aria-hidden="true" />
                  Grijze lijn = planning (baseline)
                </span>
                <span className="timeline-legend-item" role="listitem">
                  <span className="timeline-legend-line actual" aria-hidden="true" />
                  Groene lijn = actuele uitvoering
                </span>
                <span className="timeline-legend-item" role="listitem">
                  <span className="timeline-legend-dot" aria-hidden="true" />
                  Zwarte bol = start/einde werf
                </span>
                <span className="timeline-legend-item" role="listitem">
                  <span className="timeline-legend-now" aria-hidden="true" />
                  Rode lijn = referentiedatum
                </span>
              </div>
            </details>
          </section>
        </aside>

        <section className="view-card timeline-main">
          <div className="timeline-main-head">
            <h3>Dossiers in tijdlijn</h3>
            {bounds ? (
              <p className="muted-note">
                Venster: {formatNlDate(
                  `${bounds.rangeStart.getFullYear()}-${`${bounds.rangeStart.getMonth() + 1}`.padStart(2, "0")}-${`${bounds.rangeStart.getDate()}`.padStart(2, "0")}`
                )}{" "}
                tot{" "}
                {formatNlDate(
                  `${bounds.rangeEnd.getFullYear()}-${`${bounds.rangeEnd.getMonth() + 1}`.padStart(2, "0")}-${`${bounds.rangeEnd.getDate()}`.padStart(2, "0")}`
                )}
              </p>
            ) : null}
          </div>

          {timelineRows.length === 0 ? (
            <p className="muted-note">Geen dossiers in de huidige filtercombinatie.</p>
          ) : (
            <div className="timeline-scroll" role="region" aria-label="Scrollbare tijdlijn met dossiers">
              <div className="timeline-list">
                {timelineRows.map((row) => {
                  if (!bounds) {
                    return null;
                  }

                  const planBar = toBar(
                    row.work.startDate,
                    row.work.endDate,
                    bounds.rangeStart,
                    bounds.rangeEnd,
                    totalDays
                  );

                  const actualBar =
                    row.actualStart && row.actualEnd
                      ? toBar(
                          row.actualStart,
                          row.actualEnd,
                          bounds.rangeStart,
                          bounds.rangeEnd,
                          totalDays
                        )
                      : null;

                  return (
                    <article key={row.work.id} className="timeline-row">
                      <div className="timeline-row-meta">
                        <div className="timeline-row-top">
                          <strong>{row.work.dossierId}</strong>
                          <span className={`timeline-risk risk-${row.riskLevel}`}>{row.riskLevel}</span>
                        </div>
                        <p className="muted-note">
                          {row.work.status} · {row.work.straat} {row.work.huisnr} ({row.work.postcode})
                        </p>
                        <p className="muted-note">
                          Plan: {formatNlDate(row.work.startDate)} - {formatNlDate(row.work.endDate)}
                        </p>
                        <p className="muted-note">
                          Voorkeurtoezichter: {row.preferredInspector?.initials ?? "-"} ·
                          {row.daysToEnd < 0
                            ? ` ${Math.abs(row.daysToEnd)}d over tijd`
                            : ` ${row.daysToEnd}d tot einde`}
                        </p>
                      </div>

                      <div className="timeline-track-wrap">
                        <div className="timeline-track-grid">
                          <div
                            className="timeline-now-line"
                            style={{ left: `${selectedDatePct}%` }}
                            aria-hidden="true"
                          />
                          <div
                            className="timeline-bar timeline-bar-baseline"
                            style={{ left: `${planBar.left}%`, width: `${planBar.width}%` }}
                            title="Baseline/planning"
                          />
                          {actualBar ? (
                            <div
                              className="timeline-bar timeline-bar-actual"
                              style={{ left: `${actualBar.left}%`, width: `${actualBar.width}%` }}
                              title="Actuele uitvoering"
                            />
                          ) : null}
                          <div
                            className="timeline-marker"
                            style={{ left: `${toPct(row.work.startDate, bounds.rangeStart, totalDays)}%` }}
                            title="Start"
                          />
                          <div
                            className="timeline-marker"
                            style={{ left: `${toPct(row.work.endDate, bounds.rangeStart, totalDays)}%` }}
                            title="Einde"
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
