import { useEffect, useMemo, useState } from "react";
import type { Inspector, PlannedVisit } from "../../types";
import type { ActiveInspectorSession, DNVaststellingRecord } from "./contracts";
import {
  buildInspectorSession,
  createDNVaststellingDraft,
  mapVisitToDNVaststellingContext,
} from "./mappers";
import {
  loadActiveInspectorSession,
  loadDNVaststellingRecords,
  saveActiveInspectorSession,
  saveDNVaststellingRecords,
} from "./storage";

type VaststellingPhase0ViewProps = {
  inspectors: Inspector[];
  selectedDate: string;
  visitsByInspector: Record<string, PlannedVisit[]>;
  selectedVisit: PlannedVisit | null;
  onSelectVisit: (visitId: string | null) => void;
};

const DEVICE_KEY = "dn_dispatch_device_id_v1";

function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const existing = window.localStorage.getItem(DEVICE_KEY);
  if (existing) {
    return existing;
  }
  const created =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `dn-device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(DEVICE_KEY, created);
  return created;
}

export function VaststellingPhase0View({
  inspectors,
  selectedDate,
  visitsByInspector,
  selectedVisit,
  onSelectVisit,
}: VaststellingPhase0ViewProps) {
  const [session, setSession] = useState<ActiveInspectorSession | null>(null);
  const [recordsCount, setRecordsCount] = useState(0);
  const [lastCreated, setLastCreated] = useState<DNVaststellingRecord | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadInitialState = async () => {
      const loadedSession = await loadActiveInspectorSession(inspectors);
      if (cancelled) {
        return;
      }
      if (loadedSession) {
        setSession(loadedSession);
      } else if (inspectors[0]) {
        const fallback = buildInspectorSession(inspectors[0], getOrCreateDeviceId());
        await saveActiveInspectorSession(fallback);
        if (!cancelled) {
          setSession(fallback);
        }
      }

      const records = await loadDNVaststellingRecords();
      if (!cancelled) {
        setRecordsCount(records.length);
      }
    };

    void loadInitialState();
    return () => {
      cancelled = true;
    };
  }, [inspectors]);

  const myVisits = useMemo(() => {
    if (!session) {
      return [] as PlannedVisit[];
    }
    return [...(visitsByInspector[session.inspectorId] ?? [])].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.work.endDate.localeCompare(b.work.endDate);
    });
  }, [session, visitsByInspector]);

  const effectiveVisit = useMemo(() => {
    if (!session) {
      return null;
    }
    if (selectedVisit && selectedVisit.inspectorId === session.inspectorId) {
      return selectedVisit;
    }
    return myVisits[0] ?? null;
  }, [myVisits, selectedVisit, session]);

  const immutablePreview = useMemo(() => {
    if (!effectiveVisit) {
      return null;
    }
    return mapVisitToDNVaststellingContext(effectiveVisit, selectedDate);
  }, [effectiveVisit, selectedDate]);

  const handleSessionChange = async (inspectorId: string) => {
    const inspector = inspectors.find((item) => item.id === inspectorId);
    if (!inspector) {
      return;
    }

    const next = buildInspectorSession(inspector, getOrCreateDeviceId());
    await saveActiveInspectorSession(next);
    setSession(next);
    setMessage(`Actieve toezichter ingesteld: ${next.inspectorName}`);

    const firstVisit = visitsByInspector[next.inspectorId]?.[0];
    if (firstVisit) {
      onSelectVisit(firstVisit.id);
    } else {
      onSelectVisit(null);
    }
  };

  const handleCreateDraft = async () => {
    if (!session || !effectiveVisit) {
      setMessage("Geen context beschikbaar om een DN Vaststelling te starten.");
      return;
    }

    const context = mapVisitToDNVaststellingContext(effectiveVisit, selectedDate);
    const draft = createDNVaststellingDraft({ session, context });
    const previous = await loadDNVaststellingRecords();
    const records = [draft, ...previous];
    await saveDNVaststellingRecords(records);

    setLastCreated(draft);
    setRecordsCount(records.length);
    setMessage(`DN Vaststelling draft aangemaakt voor dossier ${context.dossierId}.`);
  };

  return (
    <main className="view-shell">
      <section className="view-card">
        <h2>DN Vaststelling - Fase 0</h2>
        <p className="view-subtitle">
          Contract- en contextlaag klaarzetten met dezelfde DN_DISPATCH layout (groenig) als basis
          voor terreinintegratie.
        </p>
      </section>

      <section className="view-card">
        <h3>Actieve Toezichter Sessiesleutel</h3>
        <p className="muted-note">
          Fase 0 gebruikt een lokale sessie (`dn_active_inspector_session_v1`) als startpunt voor
          terreinwerking.
        </p>
        <div className="quick-actions">
          <select
            value={session?.inspectorId ?? ""}
            onChange={(event) => void handleSessionChange(event.target.value)}
            aria-label="Actieve toezichter"
          >
            {inspectors.map((inspector) => (
              <option key={inspector.id} value={inspector.id}>
                {inspector.initials} - {inspector.name}
              </option>
            ))}
          </select>
        </div>
        {session ? (
          <p className="muted-note">
            Actief: <strong>{session.inspectorName}</strong> ({session.inspectorInitials}) -
            device {session.deviceId.slice(0, 8)}
          </p>
        ) : null}
      </section>

      <section className="view-card">
        <h3>Mijn Lijst Vandaag ({myVisits.length})</h3>
        {myVisits.length === 0 ? (
          <p className="muted-note">Geen toegewezen bezoeken in huidige filtercontext.</p>
        ) : (
          <div className="table-scroll">
            <table className="dossier-table">
              <thead>
                <tr>
                  <th>Dossier</th>
                  <th>Type</th>
                  <th>Adres</th>
                  <th>Status</th>
                  <th>Actie</th>
                </tr>
              </thead>
              <tbody>
                {myVisits.slice(0, 25).map((visit) => (
                  <tr key={visit.id}>
                    <td>{visit.work.dossierId}</td>
                    <td>{visit.visitType}</td>
                    <td>
                      {visit.work.straat} {visit.work.huisnr}, {visit.work.postcode}
                    </td>
                    <td>{visit.work.status}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={() => onSelectVisit(visit.id)}
                      >
                        Gebruik context
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="view-card">
        <h3>Immutable Startcontext</h3>
        <p className="muted-note">
          Deze waarden worden in DN Vaststelling vergrendeld opgeslagen bij opstart.
        </p>
        {immutablePreview ? (
          <div className="table-scroll">
            <table className="dossier-table">
              <tbody>
                <tr>
                  <th>Dossier</th>
                  <td>{immutablePreview.dossierId}</td>
                </tr>
                <tr>
                  <th>Werf-ID</th>
                  <td>{immutablePreview.workId}</td>
                </tr>
                <tr>
                  <th>Adres</th>
                  <td>
                    {immutablePreview.straat} {immutablePreview.huisnr},{" "}
                    {immutablePreview.postcode} {immutablePreview.district}
                  </td>
                </tr>
                <tr>
                  <th>Nutsmaatschappij</th>
                  <td>{immutablePreview.nutsBedrijf || "-"}</td>
                </tr>
                <tr>
                  <th>Toezichter</th>
                  <td>{immutablePreview.assignedInspectorName}</td>
                </tr>
                <tr>
                  <th>Gepland op</th>
                  <td>{immutablePreview.plannedVisitDate}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted-note">Selecteer eerst een bezoekcontext.</p>
        )}
        <div className="quick-actions">
          <button type="button" className="secondary-btn" onClick={() => void handleCreateDraft()}>
            Start DN Vaststelling (draft)
          </button>
        </div>
        <p className="muted-note">Totaal drafts in lokale opslag: {recordsCount}</p>
        {lastCreated ? (
          <p className="muted-note">
            Laatste draft: {lastCreated.id} - {lastCreated.completionState}
          </p>
        ) : null}
        {message ? <p className="muted-note">{message}</p> : null}
      </section>
    </main>
  );
}
