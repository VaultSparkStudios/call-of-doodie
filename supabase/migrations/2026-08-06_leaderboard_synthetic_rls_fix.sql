-- A permissive legacy SELECT policy can OR with a newer policy and bypass
-- synthetic/quarantine filtering. Replace every public SELECT policy with one
-- canonical predicate; service-role operations continue to bypass RLS.

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_row record;
BEGIN
  FOR policy_row IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'leaderboard'
      AND cmd = 'SELECT'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.leaderboard',
      policy_row.policyname
    );
  END LOOP;
END
$$;

CREATE POLICY "public_read_verified_leaderboard"
  ON public.leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (
    coalesce(quarantined, false) = false
    AND coalesce(is_synthetic, false) = false
  );
