-- Add notifications_enabled column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notifications_enabled boolean DEFAULT true;