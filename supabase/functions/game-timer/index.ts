import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { gameId } = await req.json();

    console.log('Server-side timer tick for game:', gameId);

    // Get current UTC time from database to ensure accuracy across servers
    const { data: nowData } = await supabase.rpc('now');
    const now = new Date(nowData || new Date());

    // Get game to determine whose turn it is
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // Don't start timer until both players have made their first move (current_turn > 2)
    if (game.current_turn <= 2) {
      return new Response(
        JSON.stringify({ success: true, waiting: true, message: 'Timer not started yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine whose turn it is based on current_turn
    const isPlayer1Turn = game.current_turn % 2 === 1;
    const updateField = isPlayer1Turn ? 'player1_time_remaining' : 'player2_time_remaining';
    const currentTime = isPlayer1Turn ? game.player1_time_remaining : game.player2_time_remaining;
    const currentPlayerId = isPlayer1Turn ? game.player1_id : game.player2_id;
    
    // Calculate elapsed time using server UTC time
    const lastTick = game.timer_last_updated ? new Date(game.timer_last_updated) : (game.started_at ? new Date(game.started_at) : now);
    const elapsedSeconds = Math.floor((now.getTime() - lastTick.getTime()) / 1000);
    const newTime = Math.max(0, currentTime - elapsedSeconds);

    const { error: updateError } = await supabase
      .from('games')
      .update({ [updateField]: newTime, timer_last_updated: now.toISOString() })
      .eq('id', gameId);

    if (updateError) throw updateError;

    // Check if time ran out
    if (newTime <= 0) {
      const winnerId = isPlayer1Turn 
        ? game.player2_id 
        : game.player1_id;

      // Calculate holo fee (5% of total pot)
      const platformFee = game.stake_amount * 24 * 0.05;

      // Update game as completed with winner and holo fee
      const { error: completeError } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString(),
          platform_fee: platformFee
        })
        .eq('id', gameId);

      if (completeError) throw completeError;

      // Award double stake to winner and update stats
      const { data: winnerProfile } = await supabase
        .from('profiles')
        .select('wallet_balance, games_won, games_played')
        .eq('id', winnerId)
        .single();

      const { data: loserProfile } = await supabase
        .from('profiles')
        .select('games_played')
        .eq('id', currentPlayerId)
        .single();

      if (winnerProfile) {
        const newWinnerBalance = winnerProfile.wallet_balance + (game.stake_amount * 2);
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: newWinnerBalance,
            games_won: (winnerProfile.games_won || 0) + 1,
            games_played: (winnerProfile.games_played || 0) + 1
          })
          .eq('id', winnerId);
        
        console.log('Timer timeout - winner wallet updated:', { winnerId, newWinnerBalance });
      }

      if (loserProfile) {
        await supabase
          .from('profiles')
          .update({ 
            games_played: (loserProfile.games_played || 0) + 1
          })
          .eq('id', currentPlayerId);
      }

      console.log('Game completed - timeout. Winner:', winnerId);
    }

    return new Response(
      JSON.stringify({ success: true, timeRemaining: newTime }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in game-timer function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
