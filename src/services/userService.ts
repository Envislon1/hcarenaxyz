
import { User, Match } from '@/types';
import { supabase } from "@/integrations/supabase/client";

// Current user session
let currentUser: User | null = null;

export const userService = {
  // Login user
  login: async (email: string, password: string): Promise<User> => {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) throw authError;
      
      if (authData?.user) {
      // Get wallet info
      const { data: profileData } = await supabase
        .from('profiles')
        .select('wallet_balance, username')
        .eq('id', authData.user.id)
        .single();
          
      const user: User = {
        id: authData.user.id,
        username: profileData?.username || email.split('@')[0],
        balance: profileData?.wallet_balance || 0,
        avatar: '♟',
        email: authData.user.email
      };
          
        currentUser = user;
        return user;
      }
      
      throw new Error("Authentication failed");
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const userId = session.session.user.id;
        
        // Get profile info
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, wallet_balance')
          .eq('id', userId)
          .single();
          
        const user: User = {
          id: userId,
          username: profileData?.username || 'User',
          balance: profileData?.wallet_balance || 0,
          avatar: '♟',
          email: session.session.user.email
        };
          
        currentUser = user;
        return user;
      }
    } catch (error) {
      console.error("Get current user error:", error);
    }
    
    return Promise.resolve(currentUser);
  },

  // Set current user
  setCurrentUser: (user: User): void => {
    currentUser = user;
  },

  // Logout user
  logout: async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      currentUser = null;
      return Promise.resolve();
    } catch (error) {
      console.error("Logout error:", error);
      return Promise.resolve();
    }
  },

  // Get user by ID
  getUserById: async (id: string): Promise<User | null> => {
    try {
      // Get user from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, wallet_balance')
        .eq('id', id)
        .single();
        
      if (profileError) throw profileError;
      
      return {
        id,
        username: profileData.username || 'User',
        balance: profileData.wallet_balance || 0,
        avatar: '♟'
      };
      
    } catch (error) {
      console.error("Get user by ID error:", error);
      return null;
    }
  },

  // Get all users
  getAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, wallet_balance')
        .limit(100);
        
      if (error) throw error;
      
      const users = data.map((profile) => ({
        id: profile.id,
        username: profile.username || 'User',
        balance: profile.wallet_balance || 0,
        avatar: '♟'
      }));
      
      return users;
    } catch (error) {
      console.error("Get all users error:", error);
      return [];
    }
  },

  // Update user balance
  updateBalance: async (userId: string, amount: number): Promise<User> => {
    try {
      // Update balance in Supabase profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
        
      if (profileError) throw profileError;
      
      const newBalance = (profileData.wallet_balance || 0) + amount;
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) throw updateError;
      
      // Get updated user
      const user = await userService.getUserById(userId);
      if (!user) throw new Error('Failed to get updated user');
      
      return user;
    } catch (error) {
      console.error("Update balance error:", error);
      throw error;
    }
  },

  // Create a match
  createMatch: async (match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>): Promise<Match> => {
    try {
      // Create match in Supabase (using games table)
      const { data, error } = await supabase
        .from('games')
        .insert({
          player1_id: match.whitePlayerId,
          player2_id: match.blackPlayerId || null,
          stake_amount: match.stake,
          status: match.status === 'pending' ? 'waiting' : match.status as any,
          time_limit: parseInt(match.timeControl) * 60,
          game_type: match.gameMode,
          board_state: {},
          created_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // Map database status to Match status
      const matchStatus = data.status === 'waiting' ? 'pending' : 
                         data.status === 'timeout' ? 'cancelled' : data.status;
      
      return {
        id: data.id,
        whitePlayerId: data.player1_id,
        blackPlayerId: data.player2_id || '',
        whiteUsername: match.whiteUsername,
        blackUsername: match.blackUsername,
        stake: Number(data.stake_amount),
        status: matchStatus as 'pending' | 'active' | 'completed' | 'cancelled',
        timeControl: match.timeControl,
        gameMode: data.game_type,
        createdAt: data.created_at,
        updatedAt: data.updated_at || data.created_at
      };
    } catch (error) {
      console.error("Create match error:", error);
      throw error;
    }
  },

  // Get all matches for a user
  getUserMatches: async (userId: string): Promise<Match[]> => {
    // Return empty array for demo users and transition period
    return [];
  },

  // Complete a match and handle stake transfers
  completeMatch: async (matchId: string, winnerId: string | null): Promise<Match> => {
    // This will be implemented later with proper game completion logic
    throw new Error('Not implemented yet');
  },

  // Get all matches
  getAllMatches: async (): Promise<Match[]> => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .in('status', ['active', 'completed', 'timeout']);
        
      if (error) throw error;
      
      const matches = data.map((game) => ({
        id: game.id,
        whitePlayerId: game.player1_id,
        blackPlayerId: game.player2_id || '',
        whiteUsername: '',
        blackUsername: '',
        stake: Number(game.stake_amount),
        status: game.status === 'timeout' ? 'completed' : game.status as any,
        timeControl: Math.floor(game.time_limit / 60).toString(),
        gameMode: game.game_type,
        winner: game.winner_id,
        createdAt: game.created_at,
        updatedAt: game.updated_at || game.created_at
      }));
      
      return matches;
    } catch (error) {
      console.error("Get all matches error:", error);
      return [];
    }
  }
};
