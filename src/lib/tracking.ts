import { CITIES, type City } from "./cities";

export type Point = { lat: number; lng: number };

export function haversineKm(a: Point, b: Point) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function lerpPoint(from: Point, to: Point, t: number): Point {
  return { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
}

/** Доля пройденного пути (0..1) по проекции точки на отрезок маршрута. */
export function progressOf(position: Point, from: Point, to: Point) {
  const total = haversineKm(from, to);
  if (total < 0.01) return 1;
  const done = haversineKm(from, position);
  return Math.min(1, Math.max(0, done / total));
}

function nearestCity(p: Point): { city: City; km: number } | null {
  let best: { city: City; km: number } | null = null;
  for (const c of CITIES) {
    const km = haversineKm(p, c);
    if (!best || km < best.km) best = { city: c, km };
  }
  return best;
}

/** Текстовое описание текущего положения на маршруте. */
export function describePosition(
  position: Point,
  from: Point,
  to: Point,
  toName?: string | null,
): string {
  const t = progressOf(position, from, to);
  const leftKm = haversineKm(position, to);

  if (t <= 0.03) return "В начале пути";
  if (t >= 0.97 || leftKm < 3) return "Подъезжает к точке назначения";

  const near = nearestCity(position);
  if (near && near.km < 12 && near.city.name !== toName) {
    return `Проезжает ${near.city.name}`;
  }
  const label = toName ? ` до ${toName}` : " до точки назначения";
  return `${Math.round(leftKm)} км${label} · пройдено ${Math.round(t * 100)}%`;
}
