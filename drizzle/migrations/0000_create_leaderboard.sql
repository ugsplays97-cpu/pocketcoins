CREATE TABLE public.leaderboard (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Player',
  coins bigint NOT NULL DEFAULT 0,
  crown boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leaderboard TO anon, authenticated;
GRANT ALL ON public.leaderboard TO service_role;

ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read the leaderboard"
ON public.leaderboard FOR SELECT
TO anon, authenticated
USING (true);

CREATE INDEX leaderboard_coins_idx ON public.leaderboard (coins DESC, updated_at);

-- Players have no accounts: each player keeps a private secret on their device.
-- Their public id is the SHA-256 of that secret, so only they can update their own row.
CREATE OR REPLACE FUNCTION public.submit_score(p_secret text, p_name text, p_coins bigint, p_crown boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id text;
BEGIN
  IF p_secret IS NULL OR length(p_secret) < 8 OR length(p_secret) > 64 THEN
    RAISE EXCEPTION 'bad player';
  END IF;
  v_id := encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
  INSERT INTO public.leaderboard (id, name, coins, crown, updated_at)
  VALUES (
    v_id,
    COALESCE(NULLIF(left(btrim(p_name), 16), ''), 'Player'),
    GREATEST(0, LEAST(COALESCE(p_coins, 0), 9000000000000000)),
    COALESCE(p_crown, false),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    coins = EXCLUDED.coins,
    crown = EXCLUDED.crown,
    updated_at = now();
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_score(text, text, bigint, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_score(text, text, bigint, boolean) TO anon, authenticated, service_role;