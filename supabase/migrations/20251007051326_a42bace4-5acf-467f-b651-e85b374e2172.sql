-- Add timer_last_updated column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS timer_last_updated timestamp with time zone DEFAULT now();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_games_timer_last_updated ON games(timer_last_updated) WHERE status = 'active';

-- Enable pg_cron extension for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule game-timer-sweep to run every second
SELECT cron.schedule(
  'game-timer-sweep',
  '* * * * *',
  $$
  SELECT net.http_post(
    url:='https://id-preview--025b33b9-4476-41f1-8720-750a8e38962e.lovable.app/functions/v1/game-timer-sweep',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkLXByZXZpZXctLTAyNWIzM2I5LTQ0NzYtNDFmMS04NzIwLTc1MGE4ZTM4OTYyZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzM0MDg5NjgyLCJleHAiOjIwNDk2NjU2ODJ9.c7UL-tJWVd9sjxMGZx3-LJvfBnQbOvEA-wlZa0vqLLE"}'::jsonb
  ) as request_id;
  $$
);