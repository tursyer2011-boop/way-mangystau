import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarDays, MessageSquare, Phone } from "lucide-react";
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
        content: "Детали объявления о грузоперевозке по Мангистауской области.",
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
  phone: string | null;
  show_contact: boolean;
};

function ListingPage() {
  const { kind, id } = useParams({ from: "/listing/$kind/$id" });
  const isRoute = kind === "route";
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["listing", kind, id],
    queryFn: async () => {
      const table = isRoute ? "carrier_routes" : "shipment_requests";
      const { data: row } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (!row) return null;
      const authorId = isRoute
        ? (row as { carrier_id: string }).carrier_id
        : (row as { sender_id: string }).sender_id;
      const { data: author } = await supabase
        .from("profiles")
        .select("id, nickname, username, phone, show_contact")
        .eq("id", authorId)
        .maybeSingle();
      return { row: row as Record<string, unknown>, author: author as Author | null };
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

    const carrierId = isRoute ? author.id : user.id;
    const senderId = isRoute ? user.id : author.id;

    const { data: existing } = await supabase
      .from("matches")
      .select("id")
      .eq("carrier_id", carrierId)
      .eq("sender_id", senderId)
      .eq(isRoute ? "route_id" : "request_id", id)
      .maybeSingle();

    if (existing) {
      navigate({ to: "/order/$matchId", params: { matchId: existing.id } });
      return;
    }

    const { data: created, error } = await supabase
      .from("matches")
      .insert({
        route_id: isRoute ? id : null,
        request_id: isRoute ? null : id,
        carrier_id: carrierId,
        sender_id: senderId,
        carrier_confirmed: carrierId === user.id,
        sender_confirmed: senderId === user.id,
      })
      .select("id")
      .single();

    if (error || !created) {
      toast.error(error?.message ?? "Не удалось откликнуться");
      return;
    }
    toast.success("Отклик отправлен, ожидайте подтверждения");
    navigate({ to: "/order/$matchId", params: { matchId: created.id } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="mx-auto max-w-3xl px-3 py-6">
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
    vehicle_type?: string | null;
    capacity_kg?: number | null;
    cargo_type?: string | null;
    weight_kg?: number | null;
    vehicle_photo_url?: string | null;
    photo_url?: string | null;
    status: string;
  };
  const author = data.author;
  const price = isRoute ? row.price : row.price_offer;
  const photo = isRoute ? row.vehicle_photo_url : row.photo_url;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-6">
        <div className="card-elevated overflow-hidden">
          <PhotoImage
            path={photo}
            alt={`${row.from_city} — ${row.to_city}`}
            className="h-56 w-full sm:h-80"
          />
          <div className="space-y-3 p-4">
            <Badge
              className={
                isRoute ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
              }
            >
              {isRoute ? "Еду" : "Нужна машина"}
            </Badge>
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
              {isRoute ? (
                <>
                  <div>
                    <dt className="text-muted-foreground">Тип авто</dt>
                    <dd className="font-medium">{row.vehicle_type ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Грузоподъёмность</dt>
                    <dd className="font-medium">
                      {row.capacity_kg ? `${row.capacity_kg} кг` : "—"}
                    </dd>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <dt className="text-muted-foreground">Тип груза</dt>
                    <dd className="font-medium">{row.cargo_type ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Вес</dt>
                    <dd className="font-medium">{row.weight_kg ? `${row.weight_kg} кг` : "—"}</dd>
                  </div>
                </>
              )}
              <div>
                <dt className="text-muted-foreground">Автор</dt>
                <dd className="font-medium">{author?.nickname || author?.username || "Аноним"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Статус</dt>
                <dd className="font-medium">{row.status === "open" ? "Активно" : row.status}</dd>
              </div>
            </dl>

            {author?.show_contact && author.phone ? (
              <a
                href={`tel:${author.phone}`}
                className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold"
              >
                <Phone className="h-4 w-4" /> {author.phone}
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
