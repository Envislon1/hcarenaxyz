-- Add new_game_id column to rematch_offers table
ALTER TABLE public.rematch_offers 
ADD COLUMN IF NOT EXISTS new_game_id UUID REFERENCES public.games(id);