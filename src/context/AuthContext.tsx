
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

  // Track online presence and report to database
  useEffect(() => {
    if (!user) return;

    const reportOnline = async () => {
      try {
        const { data: stats } = await supabase
          .from('realtime_stats')
          .select('id, players_online')
          .maybeSingle();
        
        if (stats?.id) {
          // Increment online count
          await supabase
            .from('realtime_stats')
            .update({ 
              players_online: (stats.players_online || 0) + 1,
              updated_at: new Date().toISOString() 
            })
            .eq('id', stats.id);
        }
      } catch (error) {
        console.error('Error reporting online status:', error);
      }
    };

    const reportOffline = async () => {
      try {
        const { data: stats } = await supabase
          .from('realtime_stats')
          .select('id, players_online')
          .maybeSingle();
        
        if (stats?.id) {
          // Decrement online count (don't go below 0)
          await supabase
            .from('realtime_stats')
            .update({ 
              players_online: Math.max(0, (stats.players_online || 0) - 1),
              updated_at: new Date().toISOString() 
            })
            .eq('id', stats.id);
        }
      } catch (error) {
        console.error('Error reporting offline status:', error);
      }
    };

    // Report online when user logs in
    reportOnline();

    // Report offline when user leaves the page or closes the browser
    const handleBeforeUnload = () => {
      reportOffline();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      reportOffline();
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
      toast({
        title: "Logged out",
        description: "You've been successfully logged out",
      });
    } catch (error) {
      console.error('Logout failed:', error);
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
