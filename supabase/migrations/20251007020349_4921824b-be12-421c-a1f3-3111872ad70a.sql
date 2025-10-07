-- Add CEO role to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND 'ceo' = ANY(enum_range(NULL::app_role)::text[])) THEN
    ALTER TYPE app_role ADD VALUE 'ceo';
  END IF;
END $$;