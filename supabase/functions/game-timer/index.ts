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

    const { gameId, playerId, timeRemaining } = await req.json();

    console.log('Updating game timer:', { gameId, playerId, timeRemaining });

    // Get game to determine which player
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    // Update time for appropriate player
    const updateField = game.player1_id === playerId 
      ? 'player1_time_remaining' 
      : 'player2_time_remaining';

    const { error: updateError } = await supabase
      .from('games')
      .update({ [updateField]: timeRemaining })
      .eq('id', gameId);

    if (updateError) throw updateError;

    // Check if time ran out
    if (timeRemaining <= 0) {
      const winnerId = game.player1_id === playerId 
        ? game.player2_id 
        : game.player1_id;

      // Update game as completed with winner
      const { error: completeError } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: winnerId,
          completed_at: new Date().toISOString()
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
        .eq('id', playerId)
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
          .eq('id', playerId);
      }

      console.log('Game completed - timeout. Winner:', winnerId);
    }

    return new Response(
      JSON.stringify({ success: true, timeRemaining }),
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
