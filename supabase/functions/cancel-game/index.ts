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

    const { gameId } = await req.json();

    // Get game details
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !game) {
      throw new Error('Game not found');
    }

    if (game.status !== 'active' && game.status !== 'waiting') {
      throw new Error('Game cannot be cancelled');
    }

    // Check if more than 2 moves have been made (after both players moved once)
    const { data: moves, error: movesError } = await supabase
      .from('game_moves')
      .select('id')
      .eq('game_id', gameId);

    if (movesError) {
      console.error('Error checking moves:', movesError);
    }

    // Allow cancellation within first 2 moves only
    if (moves && moves.length > 2) {
      return new Response(
        JSON.stringify({ error: 'Cannot cancel game after both players have moved' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate refund amount based on game type
    const piecesPerPlayer = game.game_type === 'chess' ? 16 : 12;
    const totalStake = Number(game.stake_amount) * piecesPerPlayer;
    const platformFee = Number(game.platform_fee) || 0;
    const playerFee = platformFee / 2; // Split platform fee between both players
    const refundAmount = totalStake + playerFee;

    // Refund player 1
    const { data: player1Profile, error: p1Error } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', game.player1_id)
      .single();

    if (p1Error || !player1Profile) {
      throw new Error('Failed to fetch player 1 profile');
    }

    await supabase
      .from('profiles')
      .update({ 
        wallet_balance: Number(player1Profile.wallet_balance) + refundAmount 
      })
      .eq('id', game.player1_id);

    // Refund player 2 if they joined
    if (game.player2_id) {
      const { data: player2Profile, error: p2Error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', game.player2_id)
        .single();

      if (p2Error || !player2Profile) {
        throw new Error('Failed to fetch player 2 profile');
      }

      await supabase
        .from('profiles')
        .update({ 
          wallet_balance: Number(player2Profile.wallet_balance) + refundAmount 
        })
        .eq('id', game.player2_id);
    }

    // Delete chat messages for this game
    const { error: chatDeleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('game_id', gameId);
    
    if (chatDeleteError) {
      console.error('Error deleting chat messages:', chatDeleteError);
    }

    // Update game status to cancelled with 0 holo fee
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        platform_fee: 0
      })
      .eq('id', gameId);

    if (updateError) throw updateError;

    console.log(`Game ${gameId} cancelled, refunded ${refundAmount} HC to each player`);

    return new Response(
      JSON.stringify({ success: true, refundAmount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cancel error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
