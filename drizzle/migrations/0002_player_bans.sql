CREATE TABLE public.banned_players (
  id text PRIMARY KEY,
  name text NOT NULL DEFAULT 'Player',
  banned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.banned_players TO anon, authenticated;
GRANT ALL ON public.banned_players TO service_role;
ALTER TABLE public.banned_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see who is banned" ON public.banned_players FOR SELECT TO anon, authenticated USING (true);

-- Only the owner password (checked here, on the server) can ban or unban.
CREATE OR REPLACE FUNCTION public.set_ban(p_password text, p_id text, p_name text, p_banned boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_password IS NULL OR encode(sha256(convert_to(p_password, 'UTF8')), 'hex') <> '6d82ddbfde2dea4f3d91810dbd274c8132a86446a4a2b7b0c28d08db9971917e' THEN
    RAISE EXCEPTION 'wrong password';
  END IF;
  IF p_id IS NULL OR length(p_id) < 8 OR length(p_id) > 128 THEN
    RAISE EXCEPTION 'bad player';
  END IF;
  IF p_banned THEN
    INSERT INTO public.banned_players (id, name) VALUES (p_id, COALESCE(NULLIF(left(btrim(p_name), 16), ''), 'Player'))
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, banned_at = now();
    DELETE FROM public.leaderboard WHERE id = p_id;
  ELSE
    DELETE FROM public.banned_players WHERE id = p_id;
  END IF;
  RETURN p_banned;
END;
$$;
REVOKE ALL ON FUNCTION public.set_ban(text, text, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_ban(text, text, text, boolean) TO anon, authenticated, service_role;

-- Banned players can't get back on the leaderboard.
CREATE OR REPLACE FUNCTION public.block_banned_scores()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.banned_players b WHERE b.id = NEW.id) THEN
    RAISE EXCEPTION 'banned';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER leaderboard_block_banned BEFORE INSERT OR UPDATE ON public.leaderboard
FOR EACH ROW EXECUTE FUNCTION public.block_banned_scores();