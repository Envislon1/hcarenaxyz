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

    // Get current UTC time from database to ensure accuracy across servers
    const { data: nowData } = await supabase.rpc('now');
    const now = new Date(nowData || new Date());
    console.log('Game timer sweep tick at', now.toISOString());

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('*')
      .eq('status', 'active');

    if (gamesError) throw gamesError;

    let processed = 0;
    let updated = 0;
    let completed = 0;

    for (const game of games || []) {
      processed++;

      // Wait until both players have made first moves
      if ((game.current_turn ?? 1) <= 2) continue;

      const isPlayer1Turn = game.current_turn % 2 === 1;
      const updateField = isPlayer1Turn ? 'player1_time_remaining' : 'player2_time_remaining';
      const currentTime: number = isPlayer1Turn ? game.player1_time_remaining : game.player2_time_remaining;

      // Use server UTC time for accurate calculation
      const lastTick = game.timer_last_updated ? new Date(game.timer_last_updated) : (game.started_at ? new Date(game.started_at) : now);
      const elapsedSeconds = Math.floor((now.getTime() - lastTick.getTime()) / 1000);
      if (elapsedSeconds <= 0) continue;

      const newTime = Math.max(0, (currentTime ?? 0) - elapsedSeconds);

      const { error: updateError } = await supabase
        .from('games')
        .update({ [updateField]: newTime, timer_last_updated: now.toISOString() })
        .eq('id', game.id)
        .eq('status', 'active');

      if (updateError) {
        console.error('Sweep update error for game', game.id, updateError);
        continue;
      }

      updated++;

      if (newTime <= 0) {
        const winnerId = isPlayer1Turn ? game.player2_id : game.player1_id;
        const currentPlayerId = isPlayer1Turn ? game.player1_id : game.player2_id;

        const platformFee = game.stake_amount * 24 * 0.074;

        const { error: completeError } = await supabase
          .from('games')
          .update({
            status: 'completed',
            winner_id: winnerId,
            completed_at: new Date().toISOString(),
            platform_fee: platformFee
          })
          .eq('id', game.id)
          .eq('status', 'active');

        if (completeError) {
          console.error('Sweep complete error for game', game.id, completeError);
        } else {
          completed++;

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
          }

          if (loserProfile) {
            await supabase
              .from('profiles')
              .update({ 
                games_played: (loserProfile.games_played || 0) + 1
              })
              .eq('id', currentPlayerId);
          }

          console.log('Sweep: game completed due to timeout', { gameId: game.id, winnerId });
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, updated, completed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in game-timer-sweep function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});