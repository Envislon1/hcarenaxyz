-- Fix function to set search_path
CREATE OR REPLACE FUNCTION update_games_playing_count()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Count active games
  UPDATE public.realtime_stats
  SET 
    games_playing = (SELECT COUNT(*) FROM public.games WHERE status = 'active'),
    updated_at = now();
  
  RETURN NEW;
END;
$$;