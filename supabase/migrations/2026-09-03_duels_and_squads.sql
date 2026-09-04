SET search_path TO public;
-- S163: friendly seed duels (unverified, 24h) and squad codes on the leaderboard.

CREATE TABLE IF NOT EXISTS public.duels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seed integer NOT NULL CHECK (seed >= 0 AND seed <= 999999999),
  mode text NOT NULL DEFAULT 'standard',
  difficulty text NOT NULL DEFAULT 'normal',
  challenger_name text NOT NULL CHECK (char_length(challenger_name) BETWEEN 1 AND 24),
  challenger_score integer NOT NULL CHECK (challenger_score >= 0 AND challenger_score <= 10000000),
  challenger_wave integer NOT NULL CHECK (challenger_wave >= 1 AND challenger_wave <= 10000),
  responder_name text CHECK (responder_name IS NULL OR char_length(responder_name) BETWEEN 1 AND 24),
  responder_score integer CHECK (responder_score IS NULL OR (responder_score >= 0 AND responder_score <= 10000000)),
  responder_wave integer CHECK (responder_wave IS NULL OR (responder_wave >= 1 AND responder_wave <= 10000)),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  responded_at timestamptz
);
CREATE INDEX IF NOT EXISTS duels_expires_idx ON public.duels (expires_at);
ALTER TABLE public.duels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "duels_public_read" ON public.duels;
CREATE POLICY "duels_public_read" ON public.duels FOR SELECT USING (true);

-- Anyone may open a duel; scores are self-reported and labelled friendly/unverified in the client.
DROP POLICY IF EXISTS "duels_anon_create" ON public.duels;
CREATE POLICY "duels_anon_create" ON public.duels FOR INSERT WITH CHECK (
  responder_name IS NULL AND responder_score IS NULL AND responder_wave IS NULL AND responded_at IS NULL
);

-- One response per duel, only while unanswered and unexpired; challenger fields are immutable.
DROP POLICY IF EXISTS "duels_anon_respond" ON public.duels;
CREATE POLICY "duels_anon_respond" ON public.duels FOR UPDATE
  USING (responder_score IS NULL AND expires_at > now())
  WITH CHECK (responder_score IS NOT NULL AND responder_name IS NOT NULL AND responder_wave IS NOT NULL);

CREATE OR REPLACE FUNCTION duels_protect_challenger() RETURNS trigger AS $$
BEGIN
  NEW.seed := OLD.seed; NEW.mode := OLD.mode; NEW.difficulty := OLD.difficulty;
  NEW.challenger_name := OLD.challenger_name; NEW.challenger_score := OLD.challenger_score; NEW.challenger_wave := OLD.challenger_wave;
  NEW.created_at := OLD.created_at; NEW.expires_at := OLD.expires_at;
  NEW.responded_at := now();
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS duels_protect_challenger_trg ON public.duels;
CREATE TRIGGER duels_protect_challenger_trg BEFORE UPDATE ON public.duels FOR EACH ROW EXECUTE FUNCTION duels_protect_challenger();

-- Squad boards: a short shared code groups friends on the public board.
ALTER TABLE public.leaderboard ADD COLUMN IF NOT EXISTS squad_code text;
DO $$ BEGIN
  ALTER TABLE public.leaderboard ADD CONSTRAINT leaderboard_squad_code_check CHECK (squad_code IS NULL OR squad_code ~ '^[A-Z0-9]{4,12}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS leaderboard_squad_code_idx ON public.leaderboard (squad_code, score DESC) WHERE squad_code IS NOT NULL;
