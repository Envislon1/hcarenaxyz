-- Trigger to cleanup chat messages when game ends
CREATE OR REPLACE FUNCTION public.cleanup_chat_messages()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a game is completed or cancelled, delete all chat messages
  IF NEW.status IN ('completed', 'cancelled', 'draw') AND OLD.status = 'active' THEN
    DELETE FROM public.chat_messages WHERE game_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for chat cleanup
DROP TRIGGER IF EXISTS cleanup_chat_on_game_end ON public.games;
CREATE TRIGGER cleanup_chat_on_game_end
  AFTER UPDATE OF status ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_chat_messages();

-- Trigger to cleanup rematch offers after they are accepted or declined
CREATE OR REPLACE FUNCTION public.cleanup_rematch_offers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a rematch offer is accepted or declined, delete it after a short delay
  IF NEW.status IN ('accepted', 'declined') AND OLD.status = 'pending' THEN
    DELETE FROM public.rematch_offers WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rematch cleanup
DROP TRIGGER IF EXISTS cleanup_rematch_on_response ON public.rematch_offers;
CREATE TRIGGER cleanup_rematch_on_response
  AFTER UPDATE OF status ON public.rematch_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.cleanup_rematch_offers();