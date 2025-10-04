import { supabase } from "@/integrations/supabase/client";

export interface GameMove {
  from: string; // e.g., "e2"
  to: string;   // e.g., "e4"
  piece: string;
  captured?: boolean;
}

export const gameService = {
  // Find existing pending game with same configuration
  findMatchingGame: async (gameType: string, stake: number, timeLimit: number) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('game_type', gameType)
        .eq('stake_amount', stake)
        .eq('time_limit', timeLimit)
        .eq('status', 'waiting')
        .is('player2_id', null)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error("Find matching game error:", error);
      return null;
    }
  },

  // Join existing game (atomic operation)
  joinGame: async (gameId: string, playerId: string) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          player2_id: playerId,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', gameId)
        .is('player2_id', null) // Only join if no one else has joined yet
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Join game error:", error);
      throw error;
    }
  },

  // Subscribe to game updates
  subscribeToGame: (gameId: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  },

  // Subscribe to moves
  subscribeToMoves: (gameId: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`moves:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  },

  // Make a move
  makeMove: async (gameId: string, playerId: string, move: GameMove, moveNumber: number, newBoardState: any[]) => {
    try {
      // Update game board state and turn only (no move logging)
      const { error: updateError } = await supabase
        .from('games')
        .update({
          board_state: newBoardState,
          current_turn: moveNumber + 1
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error("Make move error:", error);
      throw error;
    }
  },

  // Update player time
  updatePlayerTime: async (gameId: string, playerId: string, timeRemaining: number) => {
    try {
      const session = await supabase.auth.getSession();
      const response = await fetch('https://mrzzeejpybnbzivqyitp.supabase.co/functions/v1/game-timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.data.session?.access_token}`
        },
        body: JSON.stringify({
          gameId,
          playerId,
          timeRemaining
        })
      });

      if (!response.ok) throw new Error('Failed to update time');
      return await response.json();
    } catch (error) {
      console.error("Update time error:", error);
      throw error;
    }
  },

  // Get game by ID
  getGame: async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Get game error:", error);
      throw error;
    }
  },

  // Get moves for a game
  getMoves: async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', gameId)
        .order('move_number', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Get moves error:", error);
      return [];
    }
  },

  // Complete a game and declare winner
  completeGame: async (gameId: string, winnerId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-game', {
        body: { gameId, winnerId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Complete game error:", error);
      throw error;
    }
  }
};

// Helper: Convert chess notation (e.g., "e2") to board index (0-63)
function notationToIndex(notation: string): number {
  const col = notation.charCodeAt(0) - 97; // a=0, b=1, etc.
  const row = 8 - parseInt(notation[1]); // 8=0, 7=1, etc.
  return row * 8 + col;
}

// Helper: Convert board index to chess notation
export function indexToNotation(index: number): string {
  const row = Math.floor(index / 8);
  const col = index % 8;
  const colLetter = String.fromCharCode(97 + col);
  const rowNumber = 8 - row;
  return `${colLetter}${rowNumber}`;
}
