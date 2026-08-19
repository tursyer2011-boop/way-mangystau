import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [
      { title: "Чаты — Way Mangystau" },
      { name: "description", content: "Переписка с перевозчиками и отправителями по заказам." },
      { property: "og:title", content: "Чаты — Way Mangystau" },
      { property: "og:description", content: "Все ваши диалоги по сделкам в одном месте." },
    ],
  }),
  component: ChatsPage,
});

function ChatsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const chats = useQuery({
    queryKey: ["chats", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: matches } = await supabase
        .from("matches")
        .select("id,status,created_at")
        .order("created_at", { ascending: false });
      const ids = (matches ?? []).map((m) => m.id);
      if (ids.length === 0) return [];
      const { data: msgs } = await supabase
        .from("messages")
        .select("match_id,text,created_at")
        .in("match_id", ids)
        .order("created_at", { ascending: false });
      return (matches ?? []).map((m) => ({
        ...m,
        last: (msgs ?? []).find((x) => x.match_id === m.id) ?? null,
      }));
    },
  });

  if (!loading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="mx-auto max-w-3xl px-3 py-4">
        <BackButton />
        <h1 className="mb-3 text-2xl font-extrabold">Чаты</h1>
        {chats.isLoading && <Skeleton className="h-24 w-full" />}
        {!chats.isLoading && (chats.data?.length ?? 0) === 0 && (
          <p className="card-elevated p-6 text-center text-sm text-muted-foreground">
            Пока нет диалогов. Откликнитесь на объявление, чтобы начать общение.
          </p>
        )}
        <ul className="space-y-2">
          {(chats.data ?? []).map((c) => (
            <li key={c.id}>
              <Link
                to="/order/$matchId"
                params={{ matchId: c.id }}
                className="card-elevated flex items-center gap-3 p-3"
              >
                <MessageSquare className="h-5 w-5 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Заказ #{c.id.slice(0, 8)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.last?.text ?? "Нет сообщений"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <BottomNav />
    </div>
  );
}
