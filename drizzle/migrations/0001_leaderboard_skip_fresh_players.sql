-- Players who haven't played yet (still on the starting 100 coins) are not added to the leaderboard.
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
  IF COALESCE(p_coins, 0) = 100 AND NOT COALESCE(p_crown, false)
     AND NOT EXISTS (SELECT 1 FROM public.leaderboard WHERE id = v_id) THEN
    RETURN v_id;
  END IF;
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