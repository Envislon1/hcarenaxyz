-- Ensure the game_status enum includes all states used by the app
ALTER TYPE public.game_status ADD VALUE IF NOT EXISTS 'active';
ALTER TYPE public.game_status ADD VALUE IF NOT EXISTS 'waiting';
ALTER TYPE public.game_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE public.game_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.game_status ADD VALUE IF NOT EXISTS 'draw';