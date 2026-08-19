import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ListingCard, type Listing } from "@/components/ListingCard";
import { CITY_NAMES } from "@/lib/cities";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/rides")({
  head: () => ({
    meta: [
      { title: "Попутчики по Мангистау — Way Mangystau" },
      {
        name: "description",
        content:
          "Пассажирские поездки между Актау, Жанаозеном, Бейнеу, Жетыбаем и другими городами Мангистауской области.",
      },
      { property: "og:title", content: "Попутчики — Way Mangystau" },
      { property: "og:description", content: "Поездки водителей и заявки пассажиров." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RidesPage,
});

const ANY = "__any__";

export async function fetchRides() {
  const [rides, requests] = await Promise.all([
    supabase.from("passenger_rides").select("*").order("created_at", { ascending: false }).limit(60),
    supabase
      .from("passenger_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const items: Listing[] = [
    ...(rides.data ?? []).map((r) => ({
      kind: "ride" as const,
      id: r.id,
      from_city: r.from_city,
      to_city: r.to_city,
      travel_date: r.travel_date,
      photo: r.vehicle_photo_url,
      price: r.price_per_seat,
      detail: `${r.seats_available} мест(а) свободно`,
      created_at: r.created_at,
      is_urgent: r.is_urgent,
    })),
    ...(requests.data ?? []).map((r) => ({
      kind: "pride" as const,
      id: r.id,
      from_city: r.from_city,
      to_city: r.to_city,
      travel_date: r.travel_date,
      photo: null,
      price: r.price_offer,
      detail: `${r.seats} пассажир(а)`,
      created_at: r.created_at,
      is_urgent: r.is_urgent,
    })),
  ];

  return items.sort(
    (a, b) =>
      Number(!!b.is_urgent) - Number(!!a.is_urgent) || b.created_at.localeCompare(a.created_at),
  );
}

function RidesPage() {
  const [from, setFrom] = useState(ANY);
  const [to, setTo] = useState(ANY);
  const { data, isLoading } = useQuery({ queryKey: ["rides"], queryFn: fetchRides });

  const items = (data ?? []).filter(
    (i) => (from === ANY || i.from_city === from) && (to === ANY || i.to_city === to),
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-5xl px-3 py-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Попутчики</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Пассажирские поездки по Мангистауской области — отдельно от грузовых объявлений.
        </p>

        <section className="card-elevated mt-4 grid grid-cols-2 gap-2 p-3">
          <Select value={from} onValueChange={setFrom}>
            <SelectTrigger aria-label="Откуда">
              <SelectValue placeholder="Откуда" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Откуда: все</SelectItem>
              {CITY_NAMES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={to} onValueChange={setTo}>
            <SelectTrigger aria-label="Куда">
              <SelectValue placeholder="Куда" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Куда: все</SelectItem>
              {CITY_NAMES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        <section className="mt-4 space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          {!isLoading && items.length === 0 && (
            <p className="card-elevated p-8 text-center text-sm text-muted-foreground">
              Поездок пока нет. Разместите свою — это бесплатно.
            </p>
          )}
          {items.map((item) => (
            <ListingCard key={`${item.kind}-${item.id}`} item={item} />
          ))}
        </section>
      </main>
      <BottomNav />
    </div>
  );
}
