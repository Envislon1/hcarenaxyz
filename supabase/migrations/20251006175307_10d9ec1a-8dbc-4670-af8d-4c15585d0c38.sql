-- Create takeback_requests table
CREATE TABLE public.takeback_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  requested_by_player_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.takeback_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can create takeback requests for their games"
ON public.takeback_requests
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = takeback_requests.game_id
    AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    AND games.status = 'active'
  )
);

CREATE POLICY "Users can view takeback requests for their games"
ON public.takeback_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = takeback_requests.game_id
    AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
  )
);

CREATE POLICY "Users can update takeback requests for their games"
ON public.takeback_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = takeback_requests.game_id
    AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_takeback_requests_updated_at
BEFORE UPDATE ON public.takeback_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime
ALTER PUBLICATION supabase_realtime ADD TABLE takeback_requests;