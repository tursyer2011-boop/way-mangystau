
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text,
  nickname text,
  phone text,
  show_contact boolean NOT NULL DEFAULT false,
  role text NOT NULL DEFAULT 'both' CHECK (role IN ('sender','carrier','both')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.carrier_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_city text NOT NULL,
  to_city text NOT NULL,
  travel_date date,
  vehicle_type text,
  vehicle_photo_url text,
  capacity_kg numeric,
  price numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','in_transit','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrier_routes TO authenticated;
GRANT SELECT ON public.carrier_routes TO anon;
GRANT ALL ON public.carrier_routes TO service_role;
ALTER TABLE public.carrier_routes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "routes_select_all" ON public.carrier_routes FOR SELECT USING (true);
CREATE POLICY "routes_insert_own" ON public.carrier_routes FOR INSERT TO authenticated WITH CHECK (auth.uid() = carrier_id);
CREATE POLICY "routes_update_own" ON public.carrier_routes FOR UPDATE TO authenticated USING (auth.uid() = carrier_id) WITH CHECK (auth.uid() = carrier_id);
CREATE POLICY "routes_delete_own" ON public.carrier_routes FOR DELETE TO authenticated USING (auth.uid() = carrier_id);

CREATE TABLE public.shipment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_city text NOT NULL,
  to_city text NOT NULL,
  travel_date date,
  cargo_type text,
  weight_kg numeric,
  photo_url text,
  price_offer numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','matched','in_transit','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shipment_requests TO authenticated;
GRANT SELECT ON public.shipment_requests TO anon;
GRANT ALL ON public.shipment_requests TO service_role;
ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "requests_select_all" ON public.shipment_requests FOR SELECT USING (true);
CREATE POLICY "requests_insert_own" ON public.shipment_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "requests_update_own" ON public.shipment_requests FOR UPDATE TO authenticated USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "requests_delete_own" ON public.shipment_requests FOR DELETE TO authenticated USING (auth.uid() = sender_id);

CREATE TABLE public.matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES public.carrier_routes(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.shipment_requests(id) ON DELETE CASCADE,
  carrier_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  carrier_confirmed boolean NOT NULL DEFAULT false,
  sender_confirmed boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_transit','delivered')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_party" ON public.matches FOR SELECT TO authenticated USING (auth.uid() = carrier_id OR auth.uid() = sender_id);
CREATE POLICY "matches_insert_party" ON public.matches FOR INSERT TO authenticated WITH CHECK (auth.uid() = carrier_id OR auth.uid() = sender_id);
CREATE POLICY "matches_update_party" ON public.matches FOR UPDATE TO authenticated USING (auth.uid() = carrier_id OR auth.uid() = sender_id) WITH CHECK (auth.uid() = carrier_id OR auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.is_match_party(_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = _match_id AND (m.carrier_id = auth.uid() OR m.sender_id = auth.uid()));
$$;

CREATE OR REPLACE FUNCTION public.is_match_carrier(_match_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = _match_id AND m.carrier_id = auth.uid());
$$;

CREATE TABLE public.live_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  lat numeric NOT NULL,
  lng numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX live_tracking_match_idx ON public.live_tracking(match_id, updated_at DESC);
GRANT SELECT, INSERT ON public.live_tracking TO authenticated;
GRANT ALL ON public.live_tracking TO service_role;
ALTER TABLE public.live_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tracking_select_party" ON public.live_tracking FOR SELECT TO authenticated USING (public.is_match_party(match_id));
CREATE POLICY "tracking_insert_carrier" ON public.live_tracking FOR INSERT TO authenticated WITH CHECK (public.is_match_carrier(match_id));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_match_idx ON public.messages(match_id, created_at);
GRANT SELECT, INSERT ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_select_party" ON public.messages FOR SELECT TO authenticated USING (public.is_match_party(match_id));
CREATE POLICY "messages_insert_party" ON public.messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND public.is_match_party(match_id));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'both')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.sync_match_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.carrier_confirmed AND NEW.sender_confirmed AND NEW.status = 'pending' THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER matches_status_sync BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.sync_match_status();

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

CREATE POLICY "listing_photos_read" ON storage.objects FOR SELECT USING (bucket_id = 'listing-photos');
CREATE POLICY "listing_photos_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'listing-photos');
CREATE POLICY "listing_photos_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'listing-photos' AND owner = auth.uid());
CREATE POLICY "listing_photos_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'listing-photos' AND owner = auth.uid());
