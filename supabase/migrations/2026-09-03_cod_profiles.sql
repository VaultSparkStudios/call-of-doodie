SET search_path TO public;
-- S163: Porcelain Passport cloud backups. Namespaced because the shared
-- production project already owns a public.profiles table for another product.

CREATE TABLE IF NOT EXISTS public.cod_profiles (
  subject text PRIMARY KEY,
  backup jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cod_profiles ENABLE ROW LEVEL SECURITY;
-- No anon or authenticated policies on purpose: only the service-role Pages
-- Function reads or writes a row, after checking the subject's profile key.
REVOKE ALL ON public.cod_profiles FROM anon, authenticated;
