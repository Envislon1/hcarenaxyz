-- Create realtime stats table
CREATE TABLE IF NOT EXISTS public.realtime_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  players_online integer NOT NULL DEFAULT 0,
  games_playing integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial row
INSERT INTO public.realtime_stats (players_online, games_playing)
VALUES (0, 0)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.realtime_stats ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read stats
CREATE POLICY "Anyone can read realtime stats"
  ON public.realtime_stats
  FOR SELECT
  TO public
  USING (true);

-- Create function to update games_playing count
CREATE OR REPLACE FUNCTION update_games_playing_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Count active games
  UPDATE public.realtime_stats
  SET 
    games_playing = (SELECT COUNT(*) FROM public.games WHERE status = 'active'),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update games_playing when game status changes
DROP TRIGGER IF EXISTS update_games_playing_on_status_change ON public.games;
CREATE TRIGGER update_games_playing_on_status_change
  AFTER INSERT OR UPDATE OF status ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION update_games_playing_count();

-- Enable realtime for the stats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_stats;