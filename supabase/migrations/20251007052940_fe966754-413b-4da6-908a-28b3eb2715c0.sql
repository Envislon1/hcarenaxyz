-- Create chat_messages table for in-game chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Players can view messages in their games
CREATE POLICY "Users can view messages in their games"
ON public.chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = chat_messages.game_id
    AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
  )
);

-- Players can send messages in their active games
CREATE POLICY "Users can send messages in their games"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.games
    WHERE games.id = chat_messages.game_id
    AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    AND games.status = 'active'
  )
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_game_id ON public.chat_messages(game_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);