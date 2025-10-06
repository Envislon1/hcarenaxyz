import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { offerId, userId, accept } = await req.json();

    if (!accept) {
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get rematch offer details
    const { data: offer, error: offerError } = await supabase
      .from('rematch_offers')
      .select('*, original_game:games!rematch_offers_original_game_id_fkey(*)')
      .eq('id', offerId)
      .single();

    if (offerError || !offer) {
      throw new Error('Rematch offer not found');
    }

    const originalGame = offer.original_game;

    // Check if both players have enough balance
    const { data: player1Profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', offer.from_player_id)
      .single();

    const { data: player2Profile } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', offer.to_player_id)
      .single();

    const requiredAmount = Number(originalGame.stake_amount) + Number(originalGame.platform_fee);

    if (!player1Profile || player1Profile.wallet_balance < requiredAmount) {
      throw new Error('Insufficient balance for rematch. Please deposit more funds.');
    }

    if (!player2Profile || player2Profile.wallet_balance < requiredAmount) {
      throw new Error('Opponent has insufficient balance for rematch.');
    }

    // Deduct stakes from both players
    await supabase
      .from('profiles')
      .update({ wallet_balance: player1Profile.wallet_balance - requiredAmount })
      .eq('id', offer.from_player_id);

    await supabase
      .from('profiles')
      .update({ wallet_balance: player2Profile.wallet_balance - requiredAmount })
      .eq('id', offer.to_player_id);

    // Initialize new checkers board
    const initialBoard = Array(64).fill(null);
    for (let i = 0; i < 64; i++) {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const isBlack = (row + col) % 2 === 1;
      
      if (row < 3 && isBlack) {
        initialBoard[i] = { player: 2, king: false };
      } else if (row > 4 && isBlack) {
        initialBoard[i] = { player: 1, king: false };
      }
    }

    // Create new game with swapped players (opponent from original game now starts)
    const { data: newGame, error: gameError } = await supabase
      .from('games')
      .insert({
        player1_id: offer.to_player_id,  // Swap: acceptor becomes player1
        player2_id: offer.from_player_id, // Swap: offerer becomes player2
        game_type: originalGame.game_type,
        stake_amount: originalGame.stake_amount,
        platform_fee: originalGame.platform_fee,
        time_limit: originalGame.time_limit,
        player1_time_remaining: originalGame.time_limit,
        player2_time_remaining: originalGame.time_limit,
        status: 'active',
        started_at: new Date().toISOString(),
        board_state: initialBoard,
        current_turn: 1
      })
      .select()
      .single();

    if (gameError) {
      throw gameError;
    }

    // Mark rematch offer as accepted and store new game ID
    await supabase
      .from('rematch_offers')
      .update({ 
        status: 'accepted',
        new_game_id: newGame.id
      })
      .eq('id', offerId);

    console.log(`Rematch created: ${newGame.id}`);

    return new Response(
      JSON.stringify({ success: true, gameId: newGame.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Rematch error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
