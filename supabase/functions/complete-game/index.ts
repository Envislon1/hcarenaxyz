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

    const { gameId, winnerId } = await req.json();

    console.log('Completing game:', { gameId, winnerId });

    // Get game data
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError) throw gameError;

    const loserId = game.player1_id === winnerId ? game.player2_id : game.player1_id;

    // Calculate platform fee if not set (5% of total pot)
    const platformFee = game.platform_fee || (game.stake_amount * 24 * 0.05);

    // Update game as completed with winner and platform fee
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
    const { data: winnerProfile, error: winnerFetchError } = await supabase
      .from('profiles')
      .select('wallet_balance, games_won, games_played')
      .eq('id', winnerId)
      .single();

    if (winnerFetchError) {
      console.error('Error fetching winner profile:', winnerFetchError);
      throw winnerFetchError;
    }

    const { data: loserProfile, error: loserFetchError } = await supabase
      .from('profiles')
      .select('games_played')
      .eq('id', loserId)
      .single();

    if (loserFetchError) {
      console.error('Error fetching loser profile:', loserFetchError);
      throw loserFetchError;
    }

    // Winner gets full pot (both players' stakes: stake_amount * 24)
    const winningAmount = game.stake_amount * 24;
    const newWinnerBalance = (winnerProfile?.wallet_balance || 0) + winningAmount;
    console.log('Updating winner wallet:', { 
      winnerId,
      oldBalance: winnerProfile?.wallet_balance, 
      newBalance: newWinnerBalance, 
      stakeAmount: game.stake_amount 
    });

    const { error: winnerUpdateError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance: newWinnerBalance,
        games_won: (winnerProfile?.games_won || 0) + 1,
        games_played: (winnerProfile?.games_played || 0) + 1
      })
      .eq('id', winnerId);

    if (winnerUpdateError) {
      console.error('Error updating winner profile:', winnerUpdateError);
      throw winnerUpdateError;
    }

    // Update loser stats (stake was already deducted at game start)
    const { error: loserUpdateError } = await supabase
      .from('profiles')
      .update({ 
        games_played: (loserProfile?.games_played || 0) + 1
      })
      .eq('id', loserId);

    if (loserUpdateError) {
      console.error('Error updating loser profile:', loserUpdateError);
      throw loserUpdateError;
    }

    console.log('Game completed successfully. Winner:', winnerId, 'Loser:', loserId);

    return new Response(
      JSON.stringify({ success: true, winnerId, loserId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in complete-game function:', error);
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
