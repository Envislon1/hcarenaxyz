-- Add game_type column to games table
ALTER TABLE games ADD COLUMN game_type text NOT NULL DEFAULT 'chess' CHECK (game_type IN ('chess', 'checkers'));

-- Add time_limit column (in seconds)
ALTER TABLE games ADD COLUMN time_limit integer NOT NULL DEFAULT 300;

-- Update game_moves table to store algebraic notation
ALTER TABLE game_moves ADD COLUMN notation text;

-- Create system_settings table for conversion rates
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert conversion rate (1 Holocoin = 612 Naira)
INSERT INTO system_settings (setting_key, setting_value)
VALUES ('currency_conversion', '{"naira_per_holocoin": 612, "platform_fee_percentage": 5}')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read system settings
CREATE POLICY "Anyone can read system settings"
ON system_settings FOR SELECT
TO authenticated, anon
USING (true);

-- Update games table to store captured pieces count for checkers
ALTER TABLE games ADD COLUMN player1_captures integer DEFAULT 0;
ALTER TABLE games ADD COLUMN player2_captures integer DEFAULT 0;