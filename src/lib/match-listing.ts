import { supabase } from "@/integrations/supabase/client";

export type MatchLink = {
  route_id?: string | null;
  request_id?: string | null;
  ride_id?: string | null;
  passenger_request_id?: string | null;
};

/** Возвращает города объявления, к которому относится сделка (груз или попутка). */
export async function fetchMatchListing(m: MatchLink) {
  const cols = "from_city,to_city";
  const res = m.route_id
    ? await supabase.from("carrier_routes").select(cols).eq("id", m.route_id).maybeSingle()
    : m.request_id
      ? await supabase.from("shipment_requests").select(cols).eq("id", m.request_id).maybeSingle()
      : m.ride_id
        ? await supabase.from("passenger_rides").select(cols).eq("id", m.ride_id).maybeSingle()
        : m.passenger_request_id
          ? await supabase
              .from("passenger_requests")
              .select(cols)
              .eq("id", m.passenger_request_id)
              .maybeSingle()
          : { data: null };
  return (res.data as { from_city: string; to_city: string } | null) ?? null;
}
