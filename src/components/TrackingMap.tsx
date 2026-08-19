import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

type Point = { lat: number; lng: number };

export function TrackingMap({
  position,
  from,
  to,
  heightClass = "h-72",
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

      const center = position ?? from ?? { lat: 43.6511, lng: 51.199 };
      const map = L.map(containerRef.current).setView([center.lat, center.lng], 8);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap",
        maxZoom: 18,
      }).addTo(map);

      if (from && to) {
        L.polyline(
          [
            [from.lat, from.lng],
            [to.lat, to.lng],
          ],
          { color: "#e2711d", dashArray: "6 8" },
        ).addTo(map);
        L.circleMarker([from.lat, from.lng], { radius: 6, color: "#2563eb" }).addTo(map);
        L.circleMarker([to.lat, to.lng], { radius: 6, color: "#16a34a" }).addTo(map);
      }

      mapRef.current = map;
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
        }).addTo(map) as unknown as Marker;
      } else {
        (markerRef.current as unknown as { setLatLng: (p: [number, number]) => void }).setLatLng([
          position.lat,
          position.lng,
        ]);
      }
      map.setView([position.lat, position.lng], Math.max(map.getZoom(), 10));
    })();
  }, [position]);

  return <div ref={containerRef} className={`${heightClass} w-full overflow-hidden rounded-xl border`} />;
}
