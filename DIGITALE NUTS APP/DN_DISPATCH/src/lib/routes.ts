import type { Inspector, PlannedVisit } from "../types";

type Point = { lat: number; lng: number };

function haversineKm(a: Point, b: Point): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const aa =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return earthRadiusKm * c;
}

function nearestNeighbor(start: Point, visits: PlannedVisit[]): PlannedVisit[] {
  const remaining = [...visits];
  const ordered: PlannedVisit[] = [];
  let cursor = start;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      const distance = haversineKm(cursor, candidate.work.location);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }

    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    cursor = next.work.location;
  }

  return ordered;
}

export function computeRouteProposal(
  inspectors: Inspector[],
  visitsByInspector: Record<string, PlannedVisit[]>
): Record<string, PlannedVisit[]> {
  const result: Record<string, PlannedVisit[]> = {};

  for (const inspector of inspectors) {
    const visits = visitsByInspector[inspector.id] ?? [];
    if (visits.length === 0) {
      result[inspector.id] = [];
      continue;
    }

    const centroid = visits.reduce(
      (acc, visit) => ({
        lat: acc.lat + visit.work.location.lat,
        lng: acc.lng + visit.work.location.lng,
      }),
      { lat: 0, lng: 0 }
    );
    const center = {
      lat: centroid.lat / visits.length,
      lng: centroid.lng / visits.length,
    };
    const startVisit = visits.reduce((best, visit) => {
      if (!best) {
        return visit;
      }
      return haversineKm(center, visit.work.location) < haversineKm(center, best.work.location)
        ? visit
        : best;
    }, visits[0]);
    result[inspector.id] = nearestNeighbor(startVisit.work.location, visits);
  }

  return result;
}

export function buildRouteIndexMap(
  routes: Record<string, PlannedVisit[]>
): Record<string, number> {
  const order: Record<string, number> = {};

  Object.values(routes).forEach((visits) => {
    visits.forEach((visit, index) => {
      order[visit.id] = index + 1;
    });
  });

  return order;
}
