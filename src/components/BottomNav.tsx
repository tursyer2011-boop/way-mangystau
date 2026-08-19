import { Link } from "@tanstack/react-router";
import { Home, MessageSquare, PlusCircle, User, Users } from "lucide-react";

const items = [
  { to: "/", label: "Главная", icon: Home },
  { to: "/rides", label: "Попутчики", icon: Users },
  { to: "/create", label: "Создать", icon: PlusCircle },
  { to: "/chats", label: "Чаты", icon: MessageSquare },
  { to: "/cabinet", label: "Кабинет", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-5xl items-stretch">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium"
            >
              <Icon className="h-5 w-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
