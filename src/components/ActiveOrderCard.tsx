import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrackingMap } from "@/components/TrackingMap";
import { Badge } from "@/components/ui/badge";
import { cityCoords } from "@/lib/cities";
import { describePosition } from "@/lib/tracking";
import { supabase } from "@/integrations/supabase/client";

type Match = { id: string; route_id: string | null; request_id: string | null; status: string };

/** Карточка активного заказа с мини-картой и текстовым описанием положения. */
export function ActiveOrderCard({ match }: { match: Match }) {
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  const { data: listing } = useQuery({
    queryKey: ["match-listing", match.id],
    queryFn: async () => {
      const res = match.route_id
        ? await supabase
            .from("carrier_routes")
            .select("from_city,to_city")
            .eq("id", match.route_id)
            .maybeSingle()
        : await supabase
            .from("shipment_requests")
            .select("from_city,to_city")
            .eq("id", match.request_id!)
            .maybeSingle();
      return res.data;
    },
  });

  useEffect(() => {
    supabase
      .from("live_tracking")
      .select("lat,lng")
      .eq("match_id", match.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        const p = data?.[0];
        if (p) setPosition({ lat: Number(p.lat), lng: Number(p.lng) });
      });

    const channel = supabase
      .channel(`cabinet-track-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_tracking",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const p = payload.new as { lat: number; lng: number };
          setPosition({ lat: Number(p.lat), lng: Number(p.lng) });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  const from = cityCoords(listing?.from_city);
  const to = cityCoords(listing?.to_city);

  return (
    <div className="card-elevated space-y-2 p-3">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/order/$matchId"
          params={{ matchId: match.id }}
          className="text-sm font-semibold hover:underline"
        >
          {listing ? `${listing.from_city} → ${listing.to_city}` : `Заказ #${match.id.slice(0, 8)}`}
        </Link>
        <Badge variant="secondary">{match.status === "in_transit" ? "В пути" : "Подтверждено"}</Badge>
      </div>
      {match.status === "in_transit" && (
        <>
          <TrackingMap position={position} heightClass="h-40" {...(from ? { from } : {})} {...(to ? { to } : {})} />
          <p className="text-sm font-medium">
            {position && from && to
              ? describePosition(position, from, to, listing?.to_city)
              : "Ожидаем первые координаты перевозчика"}
          </p>
        </>
      )}
    </div>
  );
}
