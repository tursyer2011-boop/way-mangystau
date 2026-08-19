CREATE TABLE public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);

CREATE INDEX verification_codes_email_idx ON public.verification_codes (email);

GRANT ALL ON public.verification_codes TO service_role;

ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;

-- No policies: only service_role (server-side) may read or write these codes.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;