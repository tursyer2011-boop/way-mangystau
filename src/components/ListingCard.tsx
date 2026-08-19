import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Weight } from "lucide-react";
import { PhotoImage } from "@/components/PhotoImage";
import { Badge } from "@/components/ui/badge";

export type Listing = {
  kind: "route" | "request";
  id: string;
  from_city: string;
  to_city: string;
  travel_date: string | null;
  photo: string | null;
  price: number | null;
  detail: string;
  created_at: string;
};

export function ListingCard({ item }: { item: Listing }) {
  const isRoute = item.kind === "route";
  return (
    <Link
      to="/listing/$kind/$id"
      params={{ kind: item.kind, id: item.id }}
      className="card-elevated group flex overflow-hidden transition-shadow hover:shadow-lg"
    >
      <PhotoImage
        path={item.photo}
        alt={`${item.from_city} — ${item.to_city}`}
        className="h-28 w-28 shrink-0 sm:h-36 sm:w-44"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-3">
        <Badge
          className={
            isRoute
              ? "w-fit bg-primary text-primary-foreground"
              : "w-fit bg-accent text-accent-foreground"
          }
        >
          {isRoute ? "Еду" : "Нужна машина"}
        </Badge>
        <div className="flex items-center gap-1 truncate text-sm font-semibold sm:text-base">
          {item.from_city}
          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {item.to_city}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {item.travel_date && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {new Date(item.travel_date).toLocaleDateString("ru-RU")}
            </span>
          )}
          <span className="flex items-center gap-1 truncate">
            <Weight className="h-3.5 w-3.5" aria-hidden />
            {item.detail}
          </span>
        </div>
        <div className="mt-auto text-base font-bold text-primary">
          {item.price != null ? `${Number(item.price).toLocaleString("ru-RU")} ₸` : "Договорная"}
        </div>
      </div>
    </Link>
  );
}
