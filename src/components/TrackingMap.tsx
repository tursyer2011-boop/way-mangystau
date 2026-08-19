import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { CITIES } from "@/lib/cities";

type Point = { lat: number; lng: number };

/** Центр Мангистауской области (между Актау и Жанаозен) и зум на весь регион. */
const REGION_CENTER: [number, number] = [44.0, 52.4];
const REGION_ZOOM = 7;

export function TrackingMap({
  position,
  from,
  to,
  heightClass = "h-72 sm:h-96",
}: {
  position: Point | null;
  from?: Point;
  to?: Point;
  heightClass?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current).setView(REGION_CENTER, REGION_ZOOM);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      // подписи всех городов области
      for (const c of CITIES) {
        L.circleMarker([c.lat, c.lng], {
          radius: 4,
          color: "#64748b",
          fillColor: "#94a3b8",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindTooltip(c.name, { permanent: true, direction: "right", className: "city-label" });
      }

      if (from && to) {
        L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          { color: "#e2711d", weight: 4, dashArray: "6 8" },
        ).addTo(map);
        L.circleMarker([from.lat, from.lng], { radius: 7, color: "#2563eb" }).addTo(map);
        L.circleMarker([to.lat, to.lng], { radius: 7, color: "#16a34a" }).addTo(map);
        map.fitBounds(
          L.latLngBounds([
            [from.lat, from.lng],
            [to.lat, to.lng],
          ]),
          { padding: [48, 48], maxZoom: 9 },
        );
      }

      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!position || !mapRef.current) return;
    (async () => {
      const L = (await import("leaflet")).default;
      const map = mapRef.current;
      if (!map) return;
      if (!markerRef.current) {
        markerRef.current = L.circleMarker([position.lat, position.lng], {
          radius: 10,
          color: "#e2711d",
          fillColor: "#e2711d",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindTooltip("Машина", { direction: "top" }) as unknown as Marker;
      } else {
        (markerRef.current as unknown as { setLatLng: (p: [number, number]) => void }).setLatLng([
          position.lat,
          position.lng,
        ]);
      }
      map.panTo([position.lat, position.lng], { animate: true });
    })();
  }, [position]);

  return (
    <div
      ref={containerRef}
      className={`${heightClass} w-full overflow-hidden rounded-xl border`}
    />
  );
}
