-- 1. Раздельные рейтинги
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS rating_as_sender numeric NOT NULL DEFAULT 5.0,
  ADD COLUMN IF NOT EXISTS rating_as_carrier numeric NOT NULL DEFAULT 5.0;

-- 2. Отзывы
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES public.matches(id) ON DELETE SET NULL,
  author_id uuid NOT NULL,
  target_id uuid NOT NULL,
  review_type text NOT NULL CHECK (review_type IN ('sender','carrier')),
  rating numeric NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_select_all ON public.reviews FOR SELECT USING (true);
CREATE POLICY reviews_insert_own ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 3. Срочные объявления
ALTER TABLE public.carrier_routes ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;
ALTER TABLE public.shipment_requests ADD COLUMN IF NOT EXISTS is_urgent boolean NOT NULL DEFAULT false;

-- 4. Пассажирские поездки
CREATE TABLE IF NOT EXISTS public.passenger_rides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_city text NOT NULL,
  to_city text NOT NULL,
  travel_date date,
  seats_available integer NOT NULL DEFAULT 1 CHECK (seats_available BETWEEN 1 AND 5),
  price_per_seat numeric,
  vehicle_photo_url text,
  is_urgent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.passenger_rides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passenger_rides TO authenticated;
GRANT ALL ON public.passenger_rides TO service_role;
ALTER TABLE public.passenger_rides ENABLE ROW LEVEL SECURITY;
CREATE POLICY rides_select_all ON public.passenger_rides FOR SELECT USING (true);
CREATE POLICY rides_insert_own ON public.passenger_rides FOR INSERT TO authenticated WITH CHECK (auth.uid() = driver_id);
CREATE POLICY rides_update_own ON public.passenger_rides FOR UPDATE TO authenticated USING (auth.uid() = driver_id) WITH CHECK (auth.uid() = driver_id);
CREATE POLICY rides_delete_own ON public.passenger_rides FOR DELETE TO authenticated USING (auth.uid() = driver_id);

CREATE TABLE IF NOT EXISTS public.passenger_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  from_city text NOT NULL,
  to_city text NOT NULL,
  travel_date date,
  seats integer NOT NULL DEFAULT 1 CHECK (seats BETWEEN 1 AND 5),
  price_offer numeric,
  is_urgent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.passenger_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.passenger_requests TO authenticated;
GRANT ALL ON public.passenger_requests TO service_role;
ALTER TABLE public.passenger_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY preq_select_all ON public.passenger_requests FOR SELECT USING (true);
CREATE POLICY preq_insert_own ON public.passenger_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY preq_update_own ON public.passenger_requests FOR UPDATE TO authenticated USING (auth.uid() = passenger_id) WITH CHECK (auth.uid() = passenger_id);
CREATE POLICY preq_delete_own ON public.passenger_requests FOR DELETE TO authenticated USING (auth.uid() = passenger_id);

-- 5. Связь сделок с пассажирскими объявлениями
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS ride_id uuid REFERENCES public.passenger_rides(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS passenger_request_id uuid REFERENCES public.passenger_requests(id) ON DELETE SET NULL;

-- 6. Защита телефонов: полный профиль виден только владельцу
DROP POLICY IF EXISTS profiles_select_all ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
REVOKE SELECT ON public.profiles FROM anon;

CREATE OR REPLACE VIEW public.public_profiles AS
  SELECT id, username, nickname, show_contact, role,
         rating_as_sender, rating_as_carrier, created_at,
         CASE WHEN show_contact THEN phone ELSE NULL END AS phone
  FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- 7. Демо-данные
UPDATE public.profiles
SET rating_as_sender = ROUND((3.0 + random() * 2.0)::numeric, 1),
    rating_as_carrier = ROUND((3.0 + random() * 2.0)::numeric, 1);

UPDATE public.carrier_routes SET is_urgent = true
WHERE id IN (SELECT id FROM public.carrier_routes ORDER BY created_at DESC LIMIT 2);
UPDATE public.shipment_requests SET is_urgent = true
WHERE id IN (SELECT id FROM public.shipment_requests ORDER BY created_at DESC LIMIT 1);

WITH p AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.profiles
), photos AS (
  SELECT vehicle_photo_url AS url, row_number() OVER (ORDER BY created_at) AS rn
  FROM public.carrier_routes WHERE vehicle_photo_url IS NOT NULL
), v(rn, from_city, to_city, days, seats, price, urgent) AS (
  VALUES (1,'Актау','Жанаозен',1,3,3000,false),
         (2,'Жанаозен','Актау',2,2,3000,true),
         (3,'Актау','Шетпе',1,4,2500,false),
         (4,'Актау','Форт-Шевченко',3,3,4000,false),
         (5,'Бейнеу','Актау',4,2,6000,false)
)
INSERT INTO public.passenger_rides (driver_id, from_city, to_city, travel_date, seats_available, price_per_seat, vehicle_photo_url, is_urgent, status)
SELECT p.id, v.from_city, v.to_city, CURRENT_DATE + v.days, v.seats, v.price,
       (SELECT url FROM photos WHERE photos.rn = v.rn), v.urgent, 'open'
FROM v JOIN p ON p.rn = v.rn;

WITH p AS (
  SELECT id, row_number() OVER (ORDER BY created_at) AS rn FROM public.profiles
), v(rn, from_city, to_city, days, seats, price, urgent) AS (
  VALUES (6,'Актау','Жетыбай',1,1,2000,false),
         (7,'Ақшукыр','Актау',2,2,2000,false),
         (8,'Актау','Бейнеу',3,1,5500,true),
         (9,'Шетпе','Актау',2,3,2500,false)
)
INSERT INTO public.passenger_requests (passenger_id, from_city, to_city, travel_date, seats, price_offer, is_urgent, status)
SELECT p.id, v.from_city, v.to_city, CURRENT_DATE + v.days, v.seats, v.price, v.urgent, 'open'
FROM v JOIN p ON p.rn = v.rn;