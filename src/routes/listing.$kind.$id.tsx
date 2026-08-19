import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, MessageSquare, Phone, Zap } from "lucide-react";
import { toast } from "sonner";
import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { PhotoImage } from "@/components/PhotoImage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/listing/$kind/$id")({
  head: () => ({
    meta: [
      { title: "Объявление — Go Mangystau" },
      {
        name: "description",
        content: "Детали объявления о перевозке или поездке по Мангистауской области.",
      },
      { property: "og:title", content: "Объявление — Go Mangystau" },
      { property: "og:description", content: "Маршрут, дата, цена и контакты автора." },
    ],
  }),
  component: ListingPage,
});

type Author = {
  id: string;
  nickname: string | null;
  username: string | null;
  show_contact: boolean;
  rating_as_sender: number;
  rating_as_carrier: number;
  is_demo?: boolean;
};

const CONFIG = {
  route: { table: "carrier_routes", author: "carrier_id", label: "Еду" },
  request: { table: "shipment_requests", author: "sender_id", label: "Нужна машина" },
  ride: { table: "passenger_rides", author: "driver_id", label: "Попутка" },
  pride: { table: "passenger_requests", author: "passenger_id", label: "Ищу попутку" },
} as const;

type Kind = keyof typeof CONFIG;

function ListingPage() {
  const params = useParams({ from: "/listing/$kind/$id" });
  const id = params.id;
  const kind = (params.kind in CONFIG ? params.kind : "route") as Kind;
  const cfg = CONFIG[kind];
  // «поставщик услуги» — перевозчик или водитель
  const authorIsProvider = kind === "route" || kind === "ride";
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["listing", kind, id],
    queryFn: async () => {
      const { data: row } = await supabase.from(cfg.table).select("*").eq("id", id).maybeSingle();
      if (!row) return null;
      const authorId = (row as unknown as Record<string, string>)[cfg.author]!;
      const [{ data: author }, { data: contact }] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "id, nickname, username, show_contact, rating_as_sender, rating_as_carrier, is_demo",
          )
          .eq("id", authorId)
          .maybeSingle(),
        supabase.from("profile_contacts").select("phone").eq("user_id", authorId).maybeSingle(),
      ]);
      return {
        row: row as Record<string, unknown>,
        author: (author as Author | null) ?? null,
        phone: contact?.phone ?? null,
      };
    },
  });

  const respond = async () => {
    if (!user) {
      navigate({ to: "/auth" });
      return;
    }
    const author = data?.author;
    if (!author || author.id === user.id) {
      toast.error("Это ваше собственное объявление");
      return;
    }

    const carrierId = authorIsProvider ? author.id : user.id;
    const senderId = authorIsProvider ? user.id : author.id;
    const linkColumn = (
      { route: "route_id", request: "request_id", ride: "ride_id", pride: "passenger_request_id" } as const
    )[kind];

    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .eq("carrier_id", carrierId)
      .eq("sender_id", senderId)
      .eq(linkColumn, id)
      .maybeSingle();

    if (existing) {
      navigate({ to: "/order/$matchId", params: { matchId: existing.id } });
      return;
    }

    // демо-профиль «соглашается» автоматически — сделка сразу подтверждена
    const isDemo = !!author.is_demo;

    const { data: created, error } = await supabase
      .from("matches")
      .insert({
        carrier_id: carrierId,
        sender_id: senderId,
        carrier_confirmed: isDemo || carrierId === user.id,
        sender_confirmed: isDemo || senderId === user.id,
        ...({ [linkColumn]: id } as { route_id?: string }),
      })
      .select("id")
      .single();

    if (error || !created) {
      toast.error(error?.message ?? "Не удалось откликнуться");
      return;
    }
    toast.success(
      isDemo ? "Отклик принят — сделка подтверждена" : "Отклик отправлен, ожидайте подтверждения",
    );
    navigate({ to: "/order/$matchId", params: { matchId: created.id } });
  };

  if (isLoading) {
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

  if (!data?.row) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-10 text-center text-muted-foreground">
          <BackButton />
          Объявление не найдено.
        </main>
        <BottomNav />
      </div>
    );
  }

  const row = data.row as {
    from_city: string;
    to_city: string;
    travel_date: string | null;
    price?: number | null;
    price_offer?: number | null;
    price_per_seat?: number | null;
    vehicle_type?: string | null;
    capacity_kg?: number | null;
    cargo_type?: string | null;
    weight_kg?: number | null;
    seats_available?: number | null;
    seats?: number | null;
    vehicle_photo_url?: string | null;
    photo_url?: string | null;
    is_urgent?: boolean;
    status: string;
  };
  const author = data.author;
  const price = row.price ?? row.price_offer ?? row.price_per_seat ?? null;
  const photo = row.vehicle_photo_url ?? row.photo_url ?? null;

  const details: Array<[string, string]> =
    kind === "route"
      ? [
          ["Тип авто", row.vehicle_type ?? "—"],
          ["Грузоподъёмность", row.capacity_kg ? `${row.capacity_kg} кг` : "—"],
        ]
      : kind === "request"
        ? [
            ["Тип груза", row.cargo_type ?? "—"],
            ["Вес", row.weight_kg ? `${row.weight_kg} кг` : "—"],
          ]
        : kind === "ride"
          ? [
              ["Свободных мест", String(row.seats_available ?? "—")],
              ["Цена за место", price != null ? `${Number(price).toLocaleString("ru-RU")} ₸` : "—"],
            ]
          : [
              ["Пассажиров", String(row.seats ?? "—")],
              ["Предложение", price != null ? `${Number(price).toLocaleString("ru-RU")} ₸` : "—"],
            ];

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-6">
        <BackButton />
        <div className="card-elevated overflow-hidden">
          <PhotoImage
            path={photo}
            alt={`${row.from_city} — ${row.to_city}`}
            className="h-56 w-full sm:h-80"
          />
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                className={
                  authorIsProvider
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                }
              >
                {cfg.label}
              </Badge>
              {row.is_urgent && (
                <Badge className="gap-1 bg-destructive text-destructive-foreground">
                  <Zap className="h-3 w-3" aria-hidden /> СРОЧНО
                </Badge>
              )}
            </div>
            <h1 className="flex items-center gap-2 text-2xl font-extrabold">
              {row.from_city} <ArrowRight className="h-5 w-5 text-muted-foreground" />{" "}
              {row.to_city}
            </h1>
            <div className="text-2xl font-bold text-primary">
              {price != null ? `${Number(price).toLocaleString("ru-RU")} ₸` : "Цена договорная"}
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              {row.travel_date && (
                <div>
                  <dt className="text-muted-foreground">Дата</dt>
                  <dd className="flex items-center gap-1 font-medium">
                    <CalendarDays className="h-4 w-4" />
                    {new Date(row.travel_date).toLocaleDateString("ru-RU")}
                  </dd>
                </div>
              )}
              {details.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
              <div>
                <dt className="text-muted-foreground">Автор</dt>
                <dd className="font-medium">
                  {author?.nickname || author?.username || "Аноним"}
                  {author && (
                    <span className="ml-1 text-muted-foreground">
                      ★{" "}
                      {Number(
                        authorIsProvider ? author.rating_as_carrier : author.rating_as_sender,
                      ).toFixed(1)}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Статус</dt>
                <dd className="font-medium">{row.status === "open" ? "Активно" : row.status}</dd>
              </div>
            </dl>

            {author?.show_contact && data.phone ? (
              <a
                href={`tel:${data.phone}`}
                className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold"
              >
                <Phone className="h-4 w-4" /> {data.phone}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">
                Автор скрыл контакты — доступен внутренний чат.
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button className="flex-1" onClick={() => void respond()}>
                Откликнуться
              </Button>
              <Button variant="secondary" className="flex-1" onClick={() => void respond()}>
                <MessageSquare className="mr-1 h-4 w-4" /> Написать сообщение
              </Button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
