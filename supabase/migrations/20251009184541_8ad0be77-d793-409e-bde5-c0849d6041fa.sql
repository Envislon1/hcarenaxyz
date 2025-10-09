-- Allow users to insert their own transactions (needed for pending deposit/withdraw records)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'transactions' 
      AND policyname = 'Users can insert own transactions'
  ) THEN
    CREATE POLICY "Users can insert own transactions"
    ON public.transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;