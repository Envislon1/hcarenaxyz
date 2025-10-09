-- Create rematch_offers table
CREATE TABLE IF NOT EXISTS public.rematch_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  from_player_id UUID NOT NULL,
  to_player_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rematch_offers ENABLE ROW LEVEL SECURITY;

-- Create policies for rematch offers
CREATE POLICY "Users can create rematch offers"
ON public.rematch_offers
FOR INSERT
WITH CHECK (auth.uid() = from_player_id);

CREATE POLICY "Users can view rematch offers involving them"
ON public.rematch_offers
FOR SELECT
USING (auth.uid() = from_player_id OR auth.uid() = to_player_id);

CREATE POLICY "Users can update rematch offers sent to them"
ON public.rematch_offers
FOR UPDATE
USING (auth.uid() = to_player_id OR auth.uid() = from_player_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rematch_offers_updated_at
BEFORE UPDATE ON public.rematch_offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for rematch offers
ALTER PUBLICATION supabase_realtime ADD TABLE public.rematch_offers;