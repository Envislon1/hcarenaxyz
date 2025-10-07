
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@/types';
import { userService } from '@/services/userService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  onlineCount: number;
  gamesPlaying: number;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);
  const [gamesPlaying, setGamesPlaying] = useState(0);
  const { toast } = useToast();

  // Check for existing session on load
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, []);

  // Subscribe to realtime stats
  useEffect(() => {
    const fetchStats = async () => {
      const { data } = await supabase
        .from('realtime_stats')
        .select('players_online, games_playing')
        .single();
      
      if (data) {
        setOnlineCount(data.players_online);
        setGamesPlaying(data.games_playing);
      }
    };

    fetchStats();

    const channel = supabase
      .channel('realtime_stats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'realtime_stats'
        },
        (payload) => {
          if (payload.new) {
            const newData = payload.new as { players_online: number; games_playing: number };
            setOnlineCount(newData.players_online);
            setGamesPlaying(newData.games_playing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Track online presence and update database with presence count
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online_users_tracker');

    channel
      .on('presence', { event: 'sync' }, async () => {
        const presenceState = channel.presenceState();
        const uniqueUsers = Object.keys(presenceState).length;
        
        // Update database with actual presence count
        try {
          const { data: stats } = await supabase
            .from('realtime_stats')
            .select('id')
            .maybeSingle();
          
          if (stats?.id) {
            await supabase
              .from('realtime_stats')
              .update({ 
                players_online: uniqueUsers,
                updated_at: new Date().toISOString() 
              })
              .eq('id', stats.id);
          }
        } catch (error) {
          console.error('Error updating online count:', error);
        }
      })
      .on('presence', { event: 'join' }, async ({ key, newPresences }) => {
        const presenceState = channel.presenceState();
        const uniqueUsers = Object.keys(presenceState).length;
        
        // Update database with actual presence count
        try {
          const { data: stats } = await supabase
            .from('realtime_stats')
            .select('id')
            .maybeSingle();
          
          if (stats?.id) {
            await supabase
              .from('realtime_stats')
              .update({ 
                players_online: uniqueUsers,
                updated_at: new Date().toISOString() 
              })
              .eq('id', stats.id);
          }
        } catch (error) {
          console.error('Error updating online count:', error);
        }
      })
      .on('presence', { event: 'leave' }, async ({ key, leftPresences }) => {
        const presenceState = channel.presenceState();
        const uniqueUsers = Object.keys(presenceState).length;
        
        // Update database with actual presence count
        try {
          const { data: stats } = await supabase
            .from('realtime_stats')
            .select('id')
            .maybeSingle();
          
          if (stats?.id) {
            await supabase
              .from('realtime_stats')
              .update({ 
                players_online: uniqueUsers,
                updated_at: new Date().toISOString() 
              })
              .eq('id', stats.id);
          }
        } catch (error) {
          console.error('Error updating online count:', error);
        }
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

  // Subscribe to profile updates for wallet balance changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          console.log('Profile updated:', payload);
          if (payload.new) {
            setUser(prev => prev ? {
              ...prev,
              balance: payload.new.wallet_balance || prev.balance
            } : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      // Authenticate with our service
      const user = await userService.login(username, password);
      setUser(user);
      
      toast({
        title: "Login successful",
        description: `Welcome back, ${user.username}!`,
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await userService.logout();
      setUser(null);
      setLoading(false); // Ensure loading is false after logout
      toast({
        title: "Logged out",
        description: "You've been successfully logged out",
      });
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false); // Ensure loading is false even on error
      toast({
        title: "Logout failed",
        description: "An error occurred during logout",
        variant: "destructive",
      });
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, onlineCount, gamesPlaying, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
