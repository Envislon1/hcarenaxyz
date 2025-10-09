-- Add 'cancelled' status to game_status enum
ALTER TYPE game_status ADD VALUE IF NOT EXISTS 'cancelled';