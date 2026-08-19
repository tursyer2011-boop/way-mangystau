import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, User, LogOut, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3">
        <Link to="/" className="mr-auto flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Truck className="h-5 w-5 text-primary-foreground" aria-hidden />
          </span>
          <span className="text-base font-extrabold tracking-tight">
            Way <span className="text-primary">Mangystau</span>
          </span>
        </Link>

        <Button asChild size="sm" variant="ghost" className="hidden sm:inline-flex">
          <Link to="/leaderboard">Рейтинг</Link>
        </Button>

        <Button asChild size="sm" className="gap-1">
          <Link to="/create">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Разместить</span>
          </Link>
        </Button>

        {user ? (
          <>
            <Button asChild size="sm" variant="secondary">
              <Link to="/cabinet">
                <User className="h-4 w-4" />
                <span className="ml-1 hidden sm:inline">Кабинет</span>
              </Link>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              aria-label="Выйти"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button asChild size="sm" variant="secondary">
            <Link to="/auth">Войти</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
