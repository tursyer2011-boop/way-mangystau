DROP VIEW IF EXISTS public.public_profiles;

CREATE TABLE IF NOT EXISTS public.profile_contacts (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  phone text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profile_contacts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.profile_contacts TO authenticated;
GRANT ALL ON public.profile_contacts TO service_role;
ALTER TABLE public.profile_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_select_consented ON public.profile_contacts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_id AND p.show_contact));
CREATE POLICY contacts_select_own ON public.profile_contacts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY contacts_insert_own ON public.profile_contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY contacts_update_own ON public.profile_contacts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.profile_contacts (user_id, phone)
SELECT id, phone FROM public.profiles WHERE phone IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;

DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);
GRANT SELECT ON public.profiles TO anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, nickname, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'nickname', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'both')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profile_contacts (user_id, phone)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'phone', ''))
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$function$;