import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Chat } from "@/components/Chat";
import { TrackingMap } from "@/components/TrackingMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cityCoords } from "@/lib/cities";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/order/$matchId")({
  head: () => ({
    meta: [
      { title: "Заказ и трекинг — Go Mangystau" },
      { name: "description", content: "Подтверждение сделки, чат и живой трекинг машины." },
      { property: "og:title", content: "Заказ — Go Mangystau" },
      { property: "og:description", content: "Живой трекинг перевозки по Мангистау." },
    ],
  }),
  component: OrderPage,
});

type Match = {
  id: string;
  route_id: string | null;
  request_id: string | null;
  carrier_id: string;
  sender_id: string;
  carrier_confirmed: boolean;
  sender_confirmed: boolean;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает подтверждения",
  confirmed: "Подтверждено",
  in_transit: "В пути",
  delivered: "Доставлено",
};

function OrderPage() {
  const { matchId } = useParams({ from: "/order/$matchId" });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastSent = useRef(0);

  const { data, isLoading } = useQuery({
    queryKey: ["match", matchId],
    queryFn: async () => {
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .maybeSingle();
      if (!match) return null;
      const m = match as Match;
      const listing = m.route_id
        ? await supabase.from("carrier_routes").select("*").eq("id", m.route_id).maybeSingle()
        : await supabase
            .from("shipment_requests")
            .select("*")
            .eq("id", m.request_id!)
            .maybeSingle();
      return { match: m, listing: listing.data as { from_city: string; to_city: string } | null };
    },
  });

  const match = data?.match;
  const isCarrier = !!user && match?.carrier_id === user.id;

  // realtime: match status + tracking points
  useEffect(() => {
    if (!match) return;
    const channel = supabase
      .channel(`order-${matchId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${matchId}` },
        () => void qc.invalidateQueries({ queryKey: ["match", matchId] }),
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_tracking",
          filter: `match_id=eq.${matchId}`,
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
  }, [match, matchId, qc]);

  // initial last known position
  useEffect(() => {
    if (!match) return;
    supabase
      .from("live_tracking")
      .select("lat,lng")
      .eq("match_id", matchId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .then(({ data: rows }) => {
        const p = rows?.[0];
        if (p) setPosition({ lat: Number(p.lat), lng: Number(p.lng) });
      });
  }, [match, matchId]);

  useEffect(() => {
    return () => {
      if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    };
  }, []);

  if (!loading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-6">
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-10 text-center text-muted-foreground">
          Заказ не найден.
        </main>
      </div>
    );
  }

  const myConfirmed = isCarrier ? match.carrier_confirmed : match.sender_confirmed;

  const confirm = async () => {
    const patch = isCarrier ? { carrier_confirmed: true } : { sender_confirmed: true };
    const { error } = await supabase.from("matches").update(patch).eq("id", match.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Подтверждено");
    void qc.invalidateQueries({ queryKey: ["match", matchId] });
  };

  const startTrip = async () => {
    if (!("geolocation" in navigator)) {
      toast.error("Геолокация недоступна на этом устройстве");
      return;
    }
    const { error } = await supabase
      .from("matches")
      .update({ status: "in_transit" })
      .eq("id", match.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["match", matchId] });

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPosition(point);
        const now = Date.now();
        if (now - lastSent.current < 12000) return;
        lastSent.current = now;
        void supabase.from("live_tracking").insert({ match_id: match.id, ...point });
      },
      () => toast.error("Не удалось получить геолокацию"),
      { enableHighAccuracy: true, maximumAge: 5000 },
    );
    toast.success("Поездка начата, координаты передаются");
  };

  const finish = async () => {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    const { error } = await supabase
      .from("matches")
      .update({ status: "delivered" })
      .eq("id", match.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Груз доставлен");
    void qc.invalidateQueries({ queryKey: ["match", matchId] });
  };

  const from = cityCoords(data.listing?.from_city);
  const to = cityCoords(data.listing?.to_city);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl space-y-4 px-3 py-6">
        <div className="card-elevated space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-extrabold">
              {data.listing ? `${data.listing.from_city} → ${data.listing.to_city}` : "Заказ"}
            </h1>
            <Badge variant={match.status === "pending" ? "secondary" : "default"}>
              {STATUS_LABEL[match.status] ?? match.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Вы: {isCarrier ? "перевозчик" : "отправитель"} · Перевозчик{" "}
            {match.carrier_confirmed ? "подтвердил" : "не подтвердил"} · Отправитель{" "}
            {match.sender_confirmed ? "подтвердил" : "не подтвердил"}
          </p>

          <div className="flex flex-wrap gap-2">
            {match.status === "pending" && !myConfirmed && (
              <Button onClick={() => void confirm()}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Подтвердить
              </Button>
            )}
            {isCarrier && match.status === "confirmed" && (
              <Button onClick={() => void startTrip()}>
                <Navigation className="mr-1 h-4 w-4" /> Начать поездку
              </Button>
            )}
            {isCarrier && match.status === "in_transit" && (
              <Button onClick={() => void finish()}>
                <MapPin className="mr-1 h-4 w-4" /> Прибыл
              </Button>
            )}
          </div>
        </div>

        {(match.status === "confirmed" ||
          match.status === "in_transit" ||
          match.status === "delivered") && (
          <div className="card-elevated space-y-2 p-4">
            <h2 className="font-bold">Трекинг</h2>
            <TrackingMap
              position={position}
              {...(from ? { from } : {})}
              {...(to ? { to } : {})}
            />
            {!position && (
              <p className="text-sm text-muted-foreground">
                Координаты появятся, когда перевозчик начнёт поездку.
              </p>
            )}
          </div>
        )}

        <div>
          <h2 className="mb-2 font-bold">Чат</h2>
          {user && <Chat matchId={match.id} userId={user.id} />}
        </div>
      </main>
    </div>
  );
}
