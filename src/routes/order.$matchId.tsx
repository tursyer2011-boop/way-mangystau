import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Chat } from "@/components/Chat";
import { TrackingMap } from "@/components/TrackingMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cityCoords } from "@/lib/cities";
import { describePosition, lerpPoint, progressOf } from "@/lib/tracking";
import { fetchMatchListing, type MatchLink } from "@/lib/match-listing";
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

type Match = MatchLink & {
  id: string;
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
  const progressRef = useRef(0);

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
      const listing = await fetchMatchListing(m);
      return { match: m, listing };
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

  // keep progress in sync with the latest known position
  useEffect(() => {
    const f = cityCoords(data?.listing?.from_city);
    const t = cityCoords(data?.listing?.to_city);
    if (position && f && t) progressRef.current = progressOf(position, f, t);
  }, [position, data?.listing?.from_city, data?.listing?.to_city]);

  // демо-симуляция движения перевозчика по маршруту
  useEffect(() => {
    if (!isCarrier || match?.status !== "in_transit") return;
    const f = cityCoords(data?.listing?.from_city);
    const t = cityCoords(data?.listing?.to_city);
    if (!f || !t) return;
    const id = setInterval(() => {
      const next = Math.min(1, progressRef.current + 0.04);
      progressRef.current = next;
      const p = lerpPoint(f, t, next);
      setPosition(p);
      void supabase.from("live_tracking").insert({ match_id: matchId, ...p });
      if (next >= 1) clearInterval(id);
    }, 5000);
    return () => clearInterval(id);
  }, [isCarrier, match?.status, matchId, data?.listing?.from_city, data?.listing?.to_city]);


  if (!loading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-6">
        <BackButton />
          <Skeleton className="h-64 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-10 text-center text-muted-foreground">
        <BackButton />
          Заказ не найден.
        </main>
        <BottomNav />
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
    const { error } = await supabase
      .from("matches")
      .update({ status: "in_transit" })
      .eq("id", match.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void qc.invalidateQueries({ queryKey: ["match", matchId] });
    toast.success("Поездка начата, положение обновляется на карте");
  };

  const finish = async () => {
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
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-3xl space-y-4 px-3 py-6">
        <BackButton />
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
            {position && from && to && (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm font-semibold">
                {describePosition(position, from, to, data.listing?.to_city)}
              </p>
            )}
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
      <BottomNav />
    </div>
  );
}
