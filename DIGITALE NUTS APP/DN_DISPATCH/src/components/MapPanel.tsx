import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import maplibregl from "maplibre-gl";
import {
  Layer,
  Map as MapView,
  Marker,
  NavigationControl,
  Popup,
  Source,
  type MapRef,
} from "react-map-gl/maplibre";
import { buildVisitDecision } from "../lib/decisionEngine";
import { formatNlDate } from "../lib/dateUtils";
import type { ImpactProfile } from "../lib/impactScoring";
import type { InspectorAssignmentRole, PlannedVisit, WorkRecord } from "../types";

const POSTCODE_BOUNDARY_SOURCE_URL = "/data/postcode-boundaries.geojson";
const SELECTED_VISIT_FOCUS_OFFSET_Y = 96;

type MapPanelProps = {
  works: WorkRecord[];
  visits: PlannedVisit[];
  selectedVisitId: string | null;
  onSelectVisit: (visitId: string | null) => void;
  mapStyleUrl: string;
  routesByInspector: Record<string, PlannedVisit[]>;
  routeOrderByVisitId: Record<string, number>;
  routeEnabled: boolean;
  selectedDate: string;
  impactProfileByPostcode: Record<string, ImpactProfile>;
};

type SearchResult = {
  key: string;
  label: string;
  lat: number;
  lng: number;
  source: "lokaal" | "nominatim";
  visitId?: string;
};

type CoordinatePair = [number, number];

type MapBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

function getCenter(visits: PlannedVisit[], selectedVisitId: string | null): [number, number] {
  const selectedVisit = selectedVisitId
    ? visits.find((visit) => visit.id === selectedVisitId)
    : undefined;
  if (selectedVisit) {
    return [selectedVisit.work.location.lng, selectedVisit.work.location.lat];
  }

  if (visits.length === 0) {
    return [4.4025, 51.2194];
  }

  const sum = visits.reduce(
    (acc, visit) => ({
      lat: acc.lat + visit.work.location.lat,
      lng: acc.lng + visit.work.location.lng,
    }),
    { lat: 0, lng: 0 }
  );

  return [sum.lng / visits.length, sum.lat / visits.length];
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isLikelyAddressQuery(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) {
    return false;
  }
  const hasHouseNumber = /\b\d+[A-Za-z]?\b/.test(trimmed);
  const hasPostcode = /\b\d{4}\b/.test(trimmed);
  return hasHouseNumber && hasPostcode;
}

function mergeSearchResults(
  localResults: SearchResult[],
  remoteResults: SearchResult[],
  preferRemote: boolean
): SearchResult[] {
  const ordered = preferRemote
    ? [...remoteResults, ...localResults]
    : [...localResults, ...remoteResults];
  const merged: SearchResult[] = [];
  const seen = new Set<string>();

  for (const result of ordered) {
    const coordinateKey = `${Math.round(result.lat * 100000)}:${Math.round(result.lng * 100000)}`;
    if (seen.has(coordinateKey)) {
      continue;
    }
    seen.add(coordinateKey);
    merged.push(result);
  }

  return merged.slice(0, 8);
}

function buildASignUrl(permitRefKey?: string, permitReferenceId?: string): string | null {
  const refKey = (permitRefKey ?? "").trim().replace(/\D/g, "");
  if (refKey) {
    return `https://parkeerverbod.antwerpen.be/admin/sgw/requests/${encodeURIComponent(refKey)}`;
  }

  const normalizedReference = (permitReferenceId ?? "").trim();
  if (/^\d+$/.test(normalizedReference)) {
    return `https://parkeerverbod.antwerpen.be/admin/sgw/requests/${encodeURIComponent(normalizedReference)}`;
  }

  return null;
}

function buildGipodUrl(gipodId: string): string | null {
  const clean = (gipodId ?? "").replace(/\D/g, "");
  if (!clean) {
    return null;
  }
  return `https://gipod.vlaanderen.be/inname/${clean}`;
}

async function searchWithNominatim(
  query: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const prepared = `${query}, Antwerpen, België`;
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=jsonv2&limit=6&countrycodes=be&q=${encodeURIComponent(prepared)}`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Straatzoeker niet beschikbaar (${response.status}).`);
  }

  const data = (await response.json()) as Array<{
    place_id?: number | string;
    lat?: string;
    lon?: string;
    display_name?: string;
  }>;

  if (!Array.isArray(data)) {
    return [];
  }

  const results: SearchResult[] = [];

  for (const item of data) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    results.push({
      key: `nominatim-${item.place_id ?? `${lat}-${lng}`}`,
      label: item.display_name ?? "Onbekend zoekresultaat",
      lat,
      lng,
      source: "nominatim",
    });
  }

  return results;
}

function isWithinBounds(work: WorkRecord, bounds: MapBounds): boolean {
  const { lat, lng } = work.location;
  return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
}

function buildCurvedSegment(
  start: CoordinatePair,
  end: CoordinatePair,
  direction: 1 | -1
): CoordinatePair[] {
  const deltaLng = end[0] - start[0];
  const deltaLat = end[1] - start[1];
  const length = Math.hypot(deltaLng, deltaLat);

  if (length < 0.0001) {
    return [start, end];
  }

  const normalLng = (-deltaLat / length) * direction;
  const normalLat = (deltaLng / length) * direction;
  const curvature = Math.min(0.008, Math.max(0.0016, length * 0.24));

  const controlPoint: CoordinatePair = [
    (start[0] + end[0]) / 2 + normalLng * curvature,
    (start[1] + end[1]) / 2 + normalLat * curvature,
  ];

  const points: CoordinatePair[] = [];
  const steps = 7;

  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const oneMinus = 1 - t;
    const lng =
      oneMinus * oneMinus * start[0] +
      2 * oneMinus * t * controlPoint[0] +
      t * t * end[0];
    const lat =
      oneMinus * oneMinus * start[1] +
      2 * oneMinus * t * controlPoint[1] +
      t * t * end[1];
    points.push([lng, lat]);
  }

  return points;
}

function buildCurvedRouteCoordinates(routeVisits: PlannedVisit[]): CoordinatePair[] {
  if (routeVisits.length < 2) {
    return [];
  }

  const curvedCoordinates: CoordinatePair[] = [];

  for (let index = 0; index < routeVisits.length - 1; index += 1) {
    const start: CoordinatePair = [
      routeVisits[index].work.location.lng,
      routeVisits[index].work.location.lat,
    ];
    const end: CoordinatePair = [
      routeVisits[index + 1].work.location.lng,
      routeVisits[index + 1].work.location.lat,
    ];
    const segment = buildCurvedSegment(start, end, index % 2 === 0 ? 1 : -1);
    if (index > 0) {
      segment.shift();
    }
    curvedCoordinates.push(...segment);
  }

  return curvedCoordinates;
}

function formatInspectorRole(role?: InspectorAssignmentRole): string {
  if (role === "DEDICATED") {
    return "dedicated";
  }

  if (role === "BACKUP") {
    return "backup";
  }

  if (role === "RESERVE") {
    return "reserve";
  }

  return "toegewezen";
}

export function MapPanel({
  works,
  visits,
  selectedVisitId,
  onSelectVisit,
  mapStyleUrl,
  routesByInspector,
  routeOrderByVisitId,
  routeEnabled,
  selectedDate,
  impactProfileByPostcode,
}: MapPanelProps) {
  const mapRef = useRef<MapRef | null>(null);
  const center = useMemo(() => getCenter(visits, selectedVisitId), [selectedVisitId, visits]);
  const selectedVisit = selectedVisitId
    ? visits.find((visit) => visit.id === selectedVisitId)
    : undefined;

  const [showPostcodeBoundaries, setShowPostcodeBoundaries] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchMarker, setSearchMarker] = useState<{
    lat: number;
    lng: number;
    label: string;
  } | null>(null);
  const [legendCollapsed, setLegendCollapsed] = useState(true);
  const [isVisitPopupOpen, setIsVisitPopupOpen] = useState(false);
  const [visibleBounds, setVisibleBounds] = useState<MapBounds | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);
  const searchCacheRef = useRef<Map<string, SearchResult[]>>(new Map());

  const visitIdByWorkId = useMemo(() => {
    const map = new Map<string, string>();
    for (const visit of visits) {
      map.set(visit.work.id, visit.id);
    }
    return map;
  }, [visits]);

  const decision = useMemo(() => {
    if (!selectedVisit) {
      return null;
    }
    return buildVisitDecision(
      selectedVisit,
      visits,
      selectedDate,
      routeOrderByVisitId[selectedVisit.id],
      impactProfileByPostcode[selectedVisit.work.postcode]
    );
  }, [impactProfileByPostcode, routeOrderByVisitId, selectedDate, selectedVisit, visits]);

  const syncVisibleBounds = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return;
    }

    const bounds = map.getBounds();
    if (!bounds) {
      return;
    }

    setVisibleBounds({
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    });
  }, []);

  const visibleVisits = useMemo(() => {
    if (!visibleBounds) {
      return visits;
    }

    return visits.filter(
      (visit) => visit.id === selectedVisitId || isWithinBounds(visit.work, visibleBounds)
    );
  }, [selectedVisitId, visibleBounds, visits]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(max-width: 1220px)");
    const syncLegendState = (matches: boolean) => {
      if (matches) {
        setLegendCollapsed(true);
      }
    };

    syncLegendState(mediaQuery.matches);

    const onMediaChange = (event: MediaQueryListEvent) => {
      syncLegendState(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onMediaChange);
      return () => mediaQuery.removeEventListener("change", onMediaChange);
    }

    mediaQuery.addListener(onMediaChange);
    return () => mediaQuery.removeListener(onMediaChange);
  }, []);

  useEffect(() => {
    setIsVisitPopupOpen(Boolean(selectedVisitId));
  }, [selectedVisitId]);

  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (selectedVisit) {
      map.flyTo({
        center,
        duration: 600,
        zoom: Math.max(map.getZoom(), 14),
        offset: [0, SELECTED_VISIT_FOCUS_OFFSET_Y],
        essential: true,
      });
      return;
    }

    map.flyTo({
      center,
      duration: 600,
      zoom: Math.max(map.getZoom(), 11.6),
      essential: true,
    });
  }, [center, selectedVisit]);

  useEffect(() => {
    syncVisibleBounds();
  }, [syncVisibleBounds, mapStyleUrl, visits.length]);

  const handleCenterMap = () => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    if (selectedVisit) {
      map.flyTo({
        center,
        duration: 600,
        zoom: Math.max(map.getZoom(), 13.5),
        offset: [0, SELECTED_VISIT_FOCUS_OFFSET_Y],
        essential: true,
      });
      return;
    }

    map.flyTo({
      center,
      duration: 600,
      zoom: Math.max(map.getZoom(), 11.6),
      essential: true,
    });
  };

  const handleFocusSearchResult = (result: SearchResult) => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    map.flyTo({
      center: [result.lng, result.lat],
      zoom: Math.max(map.getZoom(), 15.2),
      duration: 700,
      essential: true,
    });

    if (result.visitId) {
      setIsVisitPopupOpen(true);
      onSelectVisit(result.visitId);
      setSearchMarker(null);
      return;
    }

    setSearchMarker({
      lat: result.lat,
      lng: result.lng,
      label: result.label,
    });
  };

  const handleStreetSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();

    if (!query) {
      setSearchResults([]);
      setSearchError(null);
      setSearchMarker(null);
      return;
    }

    const normalizedQuery = normalizeText(query);

    setSearchLoading(true);
    setSearchError(null);

    try {
      const localResults: SearchResult[] = works
        .filter((work) => {
          const haystack = normalizeText(
            `${work.straat} ${work.huisnr} ${work.postcode} ${work.district} ${work.dossierId}`
          );
          return haystack.includes(normalizedQuery);
        })
        .slice(0, 6)
        .map((work) => ({
          key: `lokaal-${work.id}`,
          label: `${work.straat} ${work.huisnr}, ${work.postcode} ${work.district}`,
          lat: work.location.lat,
          lng: work.location.lng,
          source: "lokaal" as const,
          visitId: visitIdByWorkId.get(work.id),
        }));

      if (localResults.length > 0) {
        const shouldPreferRemote = isLikelyAddressQuery(query);
        if (shouldPreferRemote) {
          try {
            const cached = searchCacheRef.current.get(normalizedQuery);
            let remoteResults = cached ?? [];
            if (!cached) {
              searchAbortRef.current?.abort();
              const controller = new AbortController();
              searchAbortRef.current = controller;
              remoteResults = await searchWithNominatim(query, controller.signal);
              searchCacheRef.current.set(normalizedQuery, remoteResults);
            }

            if (remoteResults.length > 0) {
              const mergedResults = mergeSearchResults(localResults, remoteResults, true);
              setSearchResults(mergedResults);
              handleFocusSearchResult(mergedResults[0]);
              return;
            }
          } catch (remoteError) {
            if (remoteError instanceof Error && remoteError.name === "AbortError") {
              return;
            }
          }
        }

        setSearchResults(localResults);
        handleFocusSearchResult(localResults[0]);
        return;
      }

      if (normalizedQuery.length < 3) {
        setSearchResults([]);
        setSearchError("Typ minstens 3 tekens voor externe straatzoeker.");
        return;
      }

      const cached = searchCacheRef.current.get(normalizedQuery);
      if (cached) {
        setSearchResults(cached);
        if (cached.length > 0) {
          handleFocusSearchResult(cached[0]);
        } else {
          setSearchError("Geen straatresultaten gevonden.");
        }
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;

      const remoteResults = await searchWithNominatim(query, controller.signal);
      searchCacheRef.current.set(normalizedQuery, remoteResults);
      setSearchResults(mergeSearchResults([], remoteResults, true));

      if (remoteResults.length > 0) {
        handleFocusSearchResult(remoteResults[0]);
      } else {
        setSearchError("Geen straatresultaten gevonden.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      setSearchError(error instanceof Error ? error.message : "Zoeken mislukt.");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="map-shell">
      <div className="dispatch-map">
        <MapView
          ref={mapRef}
          mapLib={maplibregl}
          mapStyle={mapStyleUrl}
          initialViewState={{ longitude: center[0], latitude: center[1], zoom: 12.2 }}
          attributionControl={false}
          dragRotate={false}
          touchPitch={false}
          onLoad={() => syncVisibleBounds()}
          onMoveEnd={() => syncVisibleBounds()}
        >
          <NavigationControl position="top-right" visualizePitch={false} />

          <div className="map-top-overlays">
            <div className={`map-overlay map-overlay-left ${legendCollapsed ? "collapsed" : ""}`}>
              <div className="map-overlay-head">
                <p className="map-overlay-title">LEGENDE</p>
                <button
                  type="button"
                  className="map-overlay-toggle"
                  onClick={() => setLegendCollapsed((previous) => !previous)}
                  aria-expanded={!legendCollapsed}
                >
                  {legendCollapsed ? "Open" : "Inklap"}
                </button>
              </div>

              {!legendCollapsed ? (
                <>
                  <p className="map-overlay-line">
                    <span className="layer-dot mandatory" /> Verplicht (start/einde)
                  </p>
                  <p className="map-overlay-line">
                    <span className="layer-dot cadence" /> Cadans (max 1 dag overslaan)
                  </p>
                  <p className="map-overlay-line">
                    <span className="layer-dot selected" /> Geselecteerde werf
                  </p>
                  {routeEnabled ? (
                    <>
                      <p className="map-overlay-title map-overlay-subtitle">Nummers in bolletjes</p>
                      <p className="map-overlay-line">
                        <span className="legend-route-number">1</span> 1e bezoek op route
                      </p>
                      <p className="map-overlay-line">
                        <span className="legend-route-number">2</span> 2e bezoek op route
                      </p>
                      <p className="map-overlay-line">
                        <span className="legend-route-number">3</span> 3e bezoek op route
                      </p>
                      <p className="map-overlay-line">
                        <span className="legend-route-number">4</span> 4e bezoek op route
                      </p>
                      <p className="map-overlay-line">
                        <span className="legend-route-number">5</span> 5e bezoek op route
                      </p>
                    </>
                  ) : null}
                  <label className="map-layer-toggle">
                    <input
                      type="checkbox"
                      checked={showPostcodeBoundaries}
                      onChange={(event) => setShowPostcodeBoundaries(event.target.checked)}
                    />
                    Postcoderanden
                  </label>
                </>
              ) : (
                <p className="map-overlay-line map-overlay-collapsed-note">Legenda ingeklapt</p>
              )}
            </div>

            <div className="map-overlay map-overlay-search">
              <form className="map-search-form" onSubmit={handleStreetSearch}>
                <input
                  type="text"
                  placeholder="Zoek straat op kaart"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
                <button type="submit" className="map-btn" disabled={searchLoading}>
                  {searchLoading ? "Zoeken..." : "Zoek"}
                </button>
              </form>
              {searchError ? <p className="map-search-error">{searchError}</p> : null}
              {searchResults.length > 0 ? (
                <div className="map-search-results">
                  {searchResults.map((result) => (
                    <button
                      key={result.key}
                      type="button"
                      className="map-search-result-btn"
                      onClick={() => handleFocusSearchResult(result)}
                    >
                      {result.label} {result.source === "nominatim" ? "• extern" : "• lokaal"}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="map-overlay map-overlay-right">
            <p>
              {visibleVisits.length}/{visits.length} actiepunten in kaartbeeld
            </p>
            <button type="button" className="map-btn" onClick={handleCenterMap}>
              Centreer
            </button>
          </div>

          {showPostcodeBoundaries ? (
            <Source id="postcode-boundaries" type="geojson" data={POSTCODE_BOUNDARY_SOURCE_URL}>
              <Layer
                id="postcode-boundary-fill"
                type="fill"
                paint={{
                  "fill-color": "#2563eb",
                  "fill-opacity": 0.08,
                }}
              />
              <Layer
                id="postcode-boundary-line"
                type="line"
                paint={{
                  "line-color": "#1d4ed8",
                  "line-width": 1.5,
                  "line-opacity": 0.64,
                }}
              />
            </Source>
          ) : null}

          {routeEnabled
            ? Object.entries(routesByInspector).map(([inspectorId, routeVisits]) => {
                if (routeVisits.length < 2) {
                  return null;
                }
                const coordinates = buildCurvedRouteCoordinates(routeVisits);
                return (
                  <Source
                    key={`route-${inspectorId}`}
                    id={`route-${inspectorId}`}
                    type="geojson"
                    data={{
                      type: "Feature",
                      properties: {},
                      geometry: {
                        type: "LineString",
                        coordinates,
                      },
                    }}
                  >
                    <Layer
                      id={`route-line-${inspectorId}`}
                      type="line"
                      paint={{
                        "line-color": routeVisits[0]?.inspectorColor ?? "#0a9396",
                        "line-width": 4.5,
                        "line-opacity": 0.76,
                        "line-blur": 0.2,
                      }}
                      layout={{
                        "line-cap": "round",
                        "line-join": "round",
                      }}
                    />
                  </Source>
                );
              })
            : null}

          {visibleVisits.map((visit) => {
            const isSelected = visit.id === selectedVisitId;
            const mandatoryClass = visit.mandatory ? "mandatory" : "cadence";
            const statusClass =
              visit.work.status === "VERGUND" ? "status-vergund" : "status-effect";
            const locationClass =
              visit.work.locationSource === "exact" ? "loc-exact" : "loc-approx";
            const order = routeOrderByVisitId[visit.id];

            return (
              <Marker
                key={visit.id}
                longitude={visit.work.location.lng}
                latitude={visit.work.location.lat}
                anchor="center"
              >
                <button
                  type="button"
                  className={`map-pin ${mandatoryClass} ${statusClass} ${locationClass} ${
                    isSelected ? "selected" : ""
                  }`}
                  onClick={() => {
                    setIsVisitPopupOpen(true);
                    onSelectVisit(visit.id);
                  }}
                  title={`${visit.work.dossierId} - ${visit.inspectorName}`}
                  style={{ "--inspector-color": visit.inspectorColor } as CSSProperties}
                >
                  <span>{routeEnabled && order ? order : visit.inspectorInitials}</span>
                </button>
              </Marker>
            );
          })}

          {searchMarker ? (
            <Marker longitude={searchMarker.lng} latitude={searchMarker.lat} anchor="bottom">
              <button
                type="button"
                className="map-search-marker"
                title={searchMarker.label}
                aria-label={`Zoekresultaat: ${searchMarker.label}`}
                onClick={() => setSearchMarker(null)}
              >
                <span aria-hidden="true">⌖</span>
              </button>
            </Marker>
          ) : null}

          {selectedVisit && decision && isVisitPopupOpen ? (
            <Popup
              longitude={selectedVisit.work.location.lng}
              latitude={selectedVisit.work.location.lat}
              className="dispatch-visit-popup"
              anchor="bottom"
              closeButton
              closeOnClick={false}
              onClose={() => setIsVisitPopupOpen(false)}
              offset={18}
              maxWidth="420px"
            >
              <div className="agent-popup">
                <section className="action-header-zone">
                  <span
                    className={`status-pill status-${selectedVisit.work.status
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    {selectedVisit.work.status}
                  </span>
                  <strong className="action-type-text">{decision.actionTypeLabel}</strong>
                  <span className={`priority-pill priority-${decision.priorityLevel.toLowerCase()}`}>
                    PRIORITEIT: {decision.priorityLevel} ({decision.priorityScore})
                  </span>
                </section>

                <section className="insight-zone">
                  <p className="zone-title">AI Insight</p>
                  <ul className="insight-list">
                    {decision.insights.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                </section>

                <section className="next-action-zone">
                  <p className="zone-title">Aanbevolen volgende stap</p>
                  <button type="button" className="next-action-btn">
                    {decision.recommendedAction}
                  </button>
                </section>

                <section className="timeline-zone">
                  <div className="timeline-head">
                    <span>{formatNlDate(selectedVisit.work.startDate)}</span>
                    <span>{formatNlDate(selectedVisit.work.endDate)}</span>
                  </div>
                  <div className="timeline-track">
                    <div
                      className={`timeline-progress ${
                        decision.daysToEnd <= 3 ? "timeline-risk" : "timeline-normal"
                      }`}
                      style={{ width: `${decision.progressPct}%` }}
                    />
                  </div>
                </section>

                <section className="location-zone">
                  <p className="zone-title">Locatie & context</p>
                  <p>
                    {selectedVisit.work.straat} {selectedVisit.work.huisnr}, {selectedVisit.work.postcode}{" "}
                    {selectedVisit.work.district}
                  </p>
                  <div className="context-tags">
                    <span>{decision.onRouteToday ? `Route #${decision.routeIndex}` : "Buiten route"}</span>
                    <span>{decision.conflictDetected ? "Conflict gedetecteerd" : "Geen conflict"}</span>
                    {decision.impactLevel ? <span>Impact: {decision.impactLevel}</span> : null}
                    <span>Vergunning: {selectedVisit.work.permitStatus || "ONBEKEND"}</span>
                    <span>
                      {selectedVisit.work.locationSource === "exact"
                        ? "Exacte locatie"
                        : "Postcode-locatie"}
                    </span>
                  </div>
                </section>

                <section className="details-zone">
                  <p className="zone-title">Dossierdetails</p>
                  <p>
                    Dossier GIPOD ID:{" "}
                    {buildGipodUrl(selectedVisit.work.gipodId) ? (
                      <a
                        href={buildGipodUrl(selectedVisit.work.gipodId) ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedVisit.work.dossierId || "-"}
                      </a>
                    ) : (
                      selectedVisit.work.dossierId || "-"
                    )}
                  </p>
                  <p>
                    Toezichter: {selectedVisit.inspectorName} (
                    {formatInspectorRole(selectedVisit.inspectorAssignmentRole)})
                  </p>
                  <p>Nutsmaatschappij: {selectedVisit.work.nutsBedrijf || "-"}</p>
                  <p>GIPOD fase: {selectedVisit.work.sourceStatus || "-"}</p>
                  <p>Categorie GW: {selectedVisit.work.gipodCategorie || "-"}</p>
                  <p>
                    Vergunningstatus: {selectedVisit.work.permitStatus || "ONBEKEND"}
                    {selectedVisit.work.permitJoinConfidence
                      ? ` (${selectedVisit.work.permitJoinConfidence})`
                      : ""}
                  </p>
                  <p>
                    Type/soort: {selectedVisit.work.gipodType || "-"} /{" "}
                    {selectedVisit.work.gipodSoort || "-"}
                  </p>
                  <p>
                    Signalisatievergunning nr:{" "}
                    {buildASignUrl(selectedVisit.work.permitRefKey, selectedVisit.work.permitReferenceId) ? (
                      <a
                        href={
                          buildASignUrl(
                            selectedVisit.work.permitRefKey,
                            selectedVisit.work.permitReferenceId
                          ) ?? "#"
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        {selectedVisit.work.permitReferenceId || "-"}
                      </a>
                    ) : (
                      selectedVisit.work.permitReferenceId || "-"
                    )}
                  </p>
                </section>
              </div>
            </Popup>
          ) : null}
        </MapView>
      </div>
    </div>
  );
}
