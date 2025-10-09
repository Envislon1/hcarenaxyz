-- Update the games table RLS policy to allow viewing completed games
-- This is needed for leaderboard functionality where users need to see 
-- completed games to calculate win rates and statistics

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their games and waiting games" ON public.games;

-- Create new policy that allows viewing completed games for leaderboard
CREATE POLICY "Users can view their games, waiting games, and completed games"
ON public.games
FOR SELECT
USING (
  auth.uid() = player1_id 
  OR auth.uid() = player2_id 
  OR status = 'waiting'::game_status
  OR status = 'completed'::game_status
);