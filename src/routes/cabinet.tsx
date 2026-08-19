import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ActiveOrderCard } from "@/components/ActiveOrderCard";
import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { ListingCard, type Listing } from "@/components/ListingCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

export const Route = createFileRoute("/cabinet")({
  head: () => ({
    meta: [
      { title: "Личный кабинет — Go Mangystau" },
      {
        name: "description",
        content: "Мои объявления, отклики, активные заказы с трекингом и чаты.",
      },
      { property: "og:title", content: "Личный кабинет — Go Mangystau" },
      { property: "og:description", content: "Управляйте объявлениями и заказами." },
    ],
  }),
  component: CabinetPage,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Ожидает подтверждения",
  confirmed: "Подтверждено",
  in_transit: "В пути",
  delivered: "Доставлено",
};

function CabinetPage() {
  const { user, profile, loading, setProfile } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState<string | null>(null);

  const mine = useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [routes, requests] = await Promise.all([
        supabase.from("carrier_routes").select("*").eq("carrier_id", user!.id),
        supabase.from("shipment_requests").select("*").eq("sender_id", user!.id),
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
          detail: [r.cargo_type, r.weight_kg ? `${r.weight_kg} кг` : null]
            .filter(Boolean)
            .join(" · "),
          created_at: r.created_at,
        })),
      ];
      return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
  });

  const matches = useQuery({
    queryKey: ["my-matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("matches")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  if (!loading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  const toggleContacts = async (value: boolean) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ show_contact: value })
      .eq("id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile(profile ? { ...profile, show_contact: value } : profile);
    toast.success(value ? "Контакты видны всем" : "Контакты скрыты, доступен чат");
  };

  const savePhone = async () => {
    if (!user || phone == null) return;
    const { error } = await supabase
      .from("profile_contacts")
      .upsert({ user_id: user.id, phone }, { onConflict: "user_id" });
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile(profile ? { ...profile, phone } : profile);
    toast.success("Телефон сохранён");
  };

  const pending = (matches.data ?? []).filter((m) => m.status === "pending");
  const active = (matches.data ?? []).filter(
    (m) => m.status === "confirmed" || m.status === "in_transit",
  );
  const done = (matches.data ?? []).filter((m) => m.status === "delivered");


  const MatchRow = ({ m }: { m: { id: string; status: string } }) => (
    <Link
      to="/order/$matchId"
      params={{ matchId: m.id }}
      className="card-elevated flex items-center justify-between gap-2 p-3 text-sm"
    >
      <span className="font-medium">Заказ #{m.id.slice(0, 8)}</span>
      <Badge variant="secondary">{STATUS_LABEL[m.status] ?? m.status}</Badge>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-6">
        <BackButton />
        <div className="mb-4 flex items-center justify-between gap-2">
          <h1 className="text-2xl font-extrabold">
            Кабинет {profile?.nickname ? `· ${profile.nickname}` : ""}
          </h1>
          <Button asChild size="sm" variant="secondary" className="gap-1 shrink-0">
            <Link to="/leaderboard">
              <Trophy className="h-4 w-4" aria-hidden />
              Лидеры
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="listings">
          <TabsList className="w-full">
            <TabsTrigger className="flex-1" value="listings">
              Объявления
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="orders">
              Заказы
            </TabsTrigger>
            <TabsTrigger className="flex-1" value="settings">
              Настройки
            </TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="space-y-3">
            {mine.isLoading && <Skeleton className="h-28 w-full" />}
            {!mine.isLoading && (mine.data?.length ?? 0) === 0 && (
              <p className="card-elevated p-6 text-center text-sm text-muted-foreground">
                У вас пока нет объявлений.
              </p>
            )}
            {(mine.data ?? []).map((item) => (
              <ListingCard key={`${item.kind}-${item.id}`} item={item} />
            ))}
            <Button asChild className="w-full">
              <Link to="/create">Разместить объявление</Link>
            </Button>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            <h2 className="text-lg font-extrabold">Мои заказы</h2>
            <section className="space-y-2">
              <h3 className="font-bold">Ожидают подтверждения</h3>
              {pending.length === 0 && (
                <p className="text-sm text-muted-foreground">Нет откликов на подтверждение.</p>
              )}
              {pending.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="font-bold">Активные заказы</h3>
              {active.length === 0 && (
                <p className="text-sm text-muted-foreground">Активных заказов нет.</p>
              )}
              {active.map((m) => (
                <ActiveOrderCard key={m.id} match={m} />
              ))}
            </section>
            <section className="space-y-2">
              <h3 className="font-bold">Завершённые</h3>
              {done.length === 0 && (
                <p className="text-sm text-muted-foreground">Завершённых заказов нет.</p>
              )}
              {done.map((m) => (
                <MatchRow key={m.id} m={m} />
              ))}
            </section>
          </TabsContent>


          <TabsContent value="settings">
            <div className="card-elevated space-y-4 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="show-contact">Показывать мои контакты всем</Label>
                  <p className="text-xs text-muted-foreground">
                    Если выключено — общение только через внутренний чат.
                  </p>
                </div>
                <Switch
                  id="show-contact"
                  checked={!!profile?.show_contact}
                  onCheckedChange={(v) => void toggleContacts(v)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  value={phone ?? profile?.phone ?? ""}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 700 000 00 00"
                />
                <Button variant="secondary" onClick={() => void savePhone()}>
                  Сохранить
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Роль: {profile?.role === "carrier" ? "Перевозчик" : profile?.role === "sender" ? "Отправитель" : "Оба"}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
}
