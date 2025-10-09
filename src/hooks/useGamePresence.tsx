import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  player1Online: boolean;
  player2Online: boolean;
  shouldControlTimer: boolean;
}

export const useGamePresence = (
  gameId: string | undefined,
  userId: string | undefined,
  player1Id: string | undefined,
  player2Id: string | undefined,
  isMyTurn: boolean
) => {
  const [presenceState, setPresenceState] = useState<PresenceState>({
    player1Online: false,
    player2Online: false,
    shouldControlTimer: false,
  });

  useEffect(() => {
    if (!gameId || !userId) return;

    const channel = supabase.channel(`game-presence-${gameId}`, {
      config: { presence: { key: userId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.values(state).flat();
        
        const p1Online = onlineUsers.some((u: any) => u.user_id === player1Id);
        const p2Online = onlineUsers.some((u: any) => u.user_id === player2Id);
        
        // Determine if current user should control the timer
        let shouldControl = false;
        
        if (p1Online && p2Online) {
          // Both online: current player controls timer
          shouldControl = isMyTurn;
        } else if (p1Online || p2Online) {
          // One online: that player controls timer
          shouldControl = userId === player1Id ? p1Online : p2Online;
        }
        // If neither online, shouldControl stays false (server controls)
        
        setPresenceState({
          player1Online: p1Online,
          player2Online: p2Online,
          shouldControlTimer: shouldControl,
        });
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.values(state).flat();
        
        const p1Online = onlineUsers.some((u: any) => u.user_id === player1Id);
        const p2Online = onlineUsers.some((u: any) => u.user_id === player2Id);
        
        let shouldControl = false;
        if (p1Online && p2Online) {
          shouldControl = isMyTurn;
        } else if (p1Online || p2Online) {
          shouldControl = userId === player1Id ? p1Online : p2Online;
        }
        
        setPresenceState({
          player1Online: p1Online,
          player2Online: p2Online,
          shouldControlTimer: shouldControl,
        });
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        const onlineUsers = Object.values(state).flat();
        
        const p1Online = onlineUsers.some((u: any) => u.user_id === player1Id);
        const p2Online = onlineUsers.some((u: any) => u.user_id === player2Id);
        
        let shouldControl = false;
        if (p1Online && p2Online) {
          shouldControl = isMyTurn;
        } else if (p1Online || p2Online) {
          shouldControl = userId === player1Id ? p1Online : p2Online;
        }
        
        setPresenceState({
          player1Online: p1Online,
          player2Online: p2Online,
          shouldControlTimer: shouldControl,
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, userId, player1Id, player2Id, isMyTurn]);

  return presenceState;
};
