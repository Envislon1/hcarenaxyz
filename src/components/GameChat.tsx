import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ChatMessage {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
}

interface GameChatProps {
  gameId: string;
  currentUserId: string;
  player1Id: string;
  player2Id: string;
  player1Username: string;
  player2Username: string;
}

export const GameChat = ({ 
  gameId, 
  currentUserId, 
  player1Id, 
  player2Id,
  player1Username,
  player2Username 
}: GameChatProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll to bottom when chat opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!gameId) return;

    // Load existing messages
    loadMessages();

    // Subscribe to new messages with broadcast channel
    const channel = supabase
      .channel(`game-chat-${gameId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: currentUserId }
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `game_id=eq.${gameId}`
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          console.log('New message received:', newMsg);
          setMessages((prev) => [...prev, newMsg]);
          
          // Play notification sound if message is from opponent
          if (newMsg.sender_id !== currentUserId) {
            const notificationSound = new Audio('/sounds/chatnotification.mp3');
            notificationSound.volume = 0.8;
            notificationSound.play().catch(e => console.log('Could not play notification:', e));
            
            // Increment unread count if chat is closed
            if (!isOpen) {
              setUnreadCount((prev) => prev + 1);
            }
          }
          
          // Auto-scroll to bottom (latest message)
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        }
      )
      .subscribe((status) => {
        console.log('Chat subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, currentUserId, isOpen]);

  const loadMessages = async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
    
    // Auto-scroll to bottom after loading
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    // Simple profanity check
    const profanityPattern = /\b(damn|hell|shit|fuck|ass|bitch)\b/i;
    if (profanityPattern.test(newMessage)) {
      toast({
        title: "Message Blocked",
        description: "Please avoid using abusive or inappropriate language.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        game_id: gameId,
        sender_id: currentUserId,
        message: newMessage.trim()
      });

    if (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setNewMessage('');
    
    // Auto-scroll to bottom after sending
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleToggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setUnreadCount(0);
    }
  };

  const getSenderName = (senderId: string) => {
    if (senderId === player1Id) return player1Username;
    if (senderId === player2Id) return player2Username;
    return 'Unknown';
  };

  return (
    <>
      {/* Chat Icon Button - Hidden when chat is open */}
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={handleToggleChat}
            size="lg"
            className="rounded-full h-14 w-14 shadow-lg relative"
            variant="default"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center text-xs font-bold">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Chat Popup */}
      {isOpen && (
        <Card className="fixed bottom-20 right-4 w-80 h-96 z-50 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Game Chat
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleChat}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Warning */}
          {/*<div className="px-3 py-2 text-xs text-muted-foreground bg-muted/50 border-b">
            ⚠️ Please be polite!
          </div>*/}

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto" ref={scrollRef}>
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwnMessage = msg.sender_id === currentUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {getSenderName(msg.sender_id)}
                    </div>
                    <div
                      className={`px-3 py-2 rounded-lg max-w-[80%] ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="flex-1"
              maxLength={200}
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              disabled={!newMessage.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}
    </>
  );
};