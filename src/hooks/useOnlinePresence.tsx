import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export const useOnlinePresence = () => {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online_users');

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState();
        const uniqueUsers = Object.keys(presenceState).length;
        setOnlineCount(uniqueUsers);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        const presenceState = channel.presenceState();
        const uniqueUsers = Object.keys(presenceState).length;
        setOnlineCount(uniqueUsers);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        const presenceState = channel.presenceState();
        const uniqueUsers = Object.keys(presenceState).length;
        setOnlineCount(uniqueUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track presence immediately upon subscription
          await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user]);

  return onlineCount;
};
