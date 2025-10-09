-- Update RLS policy to allow viewing waiting games
DROP POLICY IF EXISTS "Users can view their games" ON public.games;

-- Create new policy that allows viewing own games AND waiting games
CREATE POLICY "Users can view their games and waiting games"
ON public.games
FOR SELECT
USING (
  auth.uid() = player1_id 
  OR auth.uid() = player2_id 
  OR status = 'waiting'
);