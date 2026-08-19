import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ListingCard, type Listing } from "@/components/ListingCard";
import { CITY_NAMES } from "@/lib/cities";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Go Mangystau — биржа грузоперевозок Мангистау" },
      {
        name: "description",
        content:
          "Попутные машины и грузы по Мангистауской области: Актау, Жанаозен, Бейнеу, Курык, Шетпе. Найдите перевозчика или груз за минуту.",
      },
      { property: "og:title", content: "Go Mangystau — биржа грузоперевозок" },
      {
        property: "og:description",
        content: "Объявления перевозчиков и заявки отправителей по Мангистауской области.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const ANY = "__any__";

async function fetchFeed() {
  const [routes, requests] = await Promise.all([
    supabase.from("carrier_routes").select("*").order("created_at", { ascending: false }).limit(60),
    supabase
      .from("shipment_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);

  const items: Listing[] = [
    ...(routes.data ?? []).map((r) => ({
      kind: "route" as const,
      id: r.id,
      from_city: r.from_city,
      to_city: r.to_city,
      travel_date: r.travel_date,
      photo: r.vehicle_photo_url,
      price: r.price,
      detail: [r.vehicle_type, r.capacity_kg ? `до ${r.capacity_kg} кг` : null]
        .filter(Boolean)
        .join(" · "),
      created_at: r.created_at,
    })),
    ...(requests.data ?? []).map((r) => ({
      kind: "request" as const,
      id: r.id,
      from_city: r.from_city,
      to_city: r.to_city,
      travel_date: r.travel_date,
      photo: r.photo_url,
      price: r.price_offer,
      detail: [r.cargo_type, r.weight_kg ? `${r.weight_kg} кг` : null].filter(Boolean).join(" · "),
      created_at: r.created_at,
    })),
  ];

  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

function Index() {
  const [from, setFrom] = useState(ANY);
  const [to, setTo] = useState(ANY);
  const [date, setDate] = useState("");
  const [kind, setKind] = useState(ANY);

  const { data, isLoading } = useQuery({ queryKey: ["feed"], queryFn: fetchFeed });

  const items = (data ?? []).filter(
    (i) =>
      (from === ANY || i.from_city === from) &&
      (to === ANY || i.to_city === to) &&
      (!date || i.travel_date === date) &&
      (kind === ANY || i.kind === kind),
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-5xl px-3 py-5">
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          Грузоперевозки по Мангистауской области
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Попутные машины и грузы: Актау, Жанаозен, Бейнеу, Курык, Форт-Шевченко, Шетпе, Сай-Утес.
        </p>

        <section className="card-elevated mt-4 grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
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

          <Input
            type="date"
            aria-label="Дата"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger aria-label="Тип объявления">
              <SelectValue placeholder="Все объявления" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>Все объявления</SelectItem>
              <SelectItem value="route">Перевозчики</SelectItem>
              <SelectItem value="request">Отправители</SelectItem>
            </SelectContent>
          </Select>
        </section>

        <section className="mt-4 space-y-3">
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          {!isLoading && items.length === 0 && (
            <p className="card-elevated p-8 text-center text-sm text-muted-foreground">
              Объявлений не найдено. Разместите своё — это бесплатно.
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
