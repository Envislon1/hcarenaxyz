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
  makeMove: async (gameId: string, playerId: string, move: GameMove, moveNumber: number, newBoardState: any[], previousBoardState: any[]) => {
    try {
      // Calculate from and to indices from notation
      const fromIndex = notationToIndex(move.from);
      const toIndex = notationToIndex(move.to);
      
      // Log the move with previous board state for takeback functionality
      const { error: logError } = await supabase
        .from('game_moves')
        .insert({
          game_id: gameId,
          player_id: playerId,
          move_number: moveNumber,
          from_index: fromIndex,
          to_index: toIndex,
          captured_piece: move.captured || false,
          board_state_before: previousBoardState
        });

      if (logError) console.error("Move logging error:", logError);

      // Update game board state, turn, and timer_last_updated to prevent timer reset
      const { error: updateError } = await supabase
        .from('games')
        .update({
          board_state: newBoardState,
          current_turn: moveNumber + 1,
          timer_last_updated: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      return { success: true };
    } catch (error) {
      console.error("Make move error:", error);
      throw error;
    }
  },

  // Update player time (server-side decrement)
  updatePlayerTime: async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('game-timer', {
        body: { gameId }
      });

      if (error) throw error;
      return data;
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
  },

  // Subscribe to rematch offers (both INSERT and UPDATE events)
  subscribeToRematchOffers: (gameId: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`rematch:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'rematch_offers',
          filter: `original_game_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  },

  // Offer rematch
  offerRematch: async (gameId: string, fromPlayerId: string, toPlayerId: string) => {
    try {
      const { data, error } = await supabase
        .from('rematch_offers' as any)
        .insert({
          original_game_id: gameId,
          from_player_id: fromPlayerId,
          to_player_id: toPlayerId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Offer rematch error:", error);
      throw error;
    }
  },

  // Accept rematch
  acceptRematch: async (offerId: string, userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('handle-rematch', {
        body: { offerId, userId, accept: true }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Accept rematch error:", error);
      throw error;
    }
  },

  // Decline rematch
  declineRematch: async (offerId: string) => {
    try {
      const { error } = await supabase
        .from('rematch_offers' as any)
        .update({ status: 'declined' })
        .eq('id', offerId);

      if (error) throw error;
    } catch (error) {
      console.error("Decline rematch error:", error);
      throw error;
    }
  },

  // Resign game
  resignGame: async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('resign-game', {
        body: { gameId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Resign game error:", error);
      throw error;
    }
  },

  // Cancel game (before any moves are made)
  cancelGame: async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('cancel-game', {
        body: { gameId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Cancel game error:", error);
      throw error;
    }
  },

  // Offer draw
  offerDraw: async (gameId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('draw_offers' as any)
        .insert({
          game_id: gameId,
          offered_by_player_id: userId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Offer draw error:", error);
      throw error;
    }
  },

  // Accept draw
  acceptDraw: async (gameId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('offer-draw', {
        body: { gameId, accept: true }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Accept draw error:", error);
      throw error;
    }
  },

  // Subscribe to draw offers
  subscribeToDrawOffers: (gameId: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`draw:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'draw_offers',
          filter: `game_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
  },

  // Takeback functionality
  requestTakeback: async (gameId: string, userId: string) => {
    try {
      const { data, error } = await supabase
        .from('takeback_requests' as any)
        .insert({
          game_id: gameId,
          requested_by_player_id: userId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Request takeback error:", error);
      throw error;
    }
  },

  acceptTakeback: async (requestId: string, gameId: string) => {
    try {
      // Get the current game state
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('board_state, current_turn')
        .eq('id', gameId)
        .single();

      if (gameError) throw gameError;

      // Only allow takeback if there have been at least 2 moves
      if (gameData.current_turn <= 2) {
        throw new Error('Not enough moves to take back');
      }

      // Get the board state from 2 moves ago (revert twice)
      const { data: previousMove, error: moveError } = await supabase
        .from('game_moves')
        .select('board_state_before')
        .eq('game_id', gameId)
        .eq('move_number', gameData.current_turn - 2)
        .single();

      if (moveError) {
        console.error("Error fetching previous move:", moveError);
        throw new Error('Cannot find previous board state');
      }

      // Update request status
      const { error: updateError } = await supabase
        .from('takeback_requests' as any)
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Restore board state from 2 moves ago and decrement turn counter by 2
      // This gives the turn back to the initiator
      const { error: gameUpdateError } = await supabase
        .from('games')
        .update({
          board_state: previousMove.board_state_before,
          current_turn: gameData.current_turn - 2
        })
        .eq('id', gameId);

      if (gameUpdateError) throw gameUpdateError;
    } catch (error) {
      console.error("Accept takeback error:", error);
      throw error;
    }
  },

  declineTakeback: async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('takeback_requests' as any)
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;
    } catch (error) {
      console.error("Decline takeback error:", error);
      throw error;
    }
  },

  subscribeToTakebackRequests: (gameId: string, callback: (payload: any) => void) => {
    const channel = supabase
      .channel(`takeback:${gameId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'takeback_requests',
          filter: `game_id=eq.${gameId}`
        },
        callback
      )
      .subscribe();

    return channel;
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
