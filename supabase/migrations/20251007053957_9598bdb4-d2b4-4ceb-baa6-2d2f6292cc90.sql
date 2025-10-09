-- Enable realtime for chat_messages table
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Add chat_messages to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;