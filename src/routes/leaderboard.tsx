import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Рейтинг перевозчиков и отправителей — Go Mangystau" },
      {
        name: "description",
        content:
          "Лидерборд Go Mangystau: отдельные рейтинги перевозчиков и отправителей грузов по Мангистауской области.",
      },
      { property: "og:title", content: "Лидерборд — Go Mangystau" },
      { property: "og:description", content: "Раздельные рейтинги перевозчиков и отправителей." },
    ],
  }),
  component: LeaderboardPage,
});

type Row = {
  id: string;
  nickname: string | null;
  username: string | null;
  rating_as_sender: number;
  rating_as_carrier: number;
};

function List({ rows, field }: { rows: Row[]; field: "rating_as_sender" | "rating_as_carrier" }) {
  const sorted = [...rows].sort((a, b) => Number(b[field]) - Number(a[field])).slice(0, 20);
  return (
    <ol className="space-y-2">
      {sorted.map((r, i) => (
        <li key={r.id} className="card-elevated flex items-center gap-3 p-3">
          <span className="w-6 text-center text-sm font-bold text-muted-foreground">{i + 1}</span>
          <span className="flex-1 truncate font-semibold">
            {r.nickname || r.username || "Аноним"}
          </span>
          <span className="flex items-center gap-1 font-bold text-primary">
            <Star className="h-4 w-4 fill-current" aria-hidden />
            {Number(r[field]).toFixed(1)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard"],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from("profiles")
        .select("id, nickname, username, rating_as_sender, rating_as_carrier");
      return (rows ?? []) as Row[];
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-2xl px-3 py-6">
        <BackButton />
        <h1 className="mb-4 text-2xl font-extrabold">Лидерборд</h1>
        {isLoading && <Skeleton className="h-64 w-full" />}
        {!isLoading && (
          <Tabs defaultValue="carrier">
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="carrier">
                Рейтинг перевозчиков
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="sender">
                Рейтинг отправителей
              </TabsTrigger>
            </TabsList>
            <TabsContent value="carrier">
              <List rows={data ?? []} field="rating_as_carrier" />
            </TabsContent>
            <TabsContent value="sender">
              <List rows={data ?? []} field="rating_as_sender" />
            </TabsContent>
          </Tabs>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
