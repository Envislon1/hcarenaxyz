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

    if (game.status !== 'active') {
      throw new Error('Game is not active');
    }

    // Determine winner (opponent of resigning player)
    const winnerId = user.id === game.player1_id ? game.player2_id : game.player1_id;

    // Calculate holo fee (7.4% of total pot)
    const platformFee = game.platform_fee || (game.stake_amount * 24 * 0.074);

    // Delete chat messages for this game
    const { error: chatDeleteError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('game_id', gameId);
    
    if (chatDeleteError) {
      console.error('Error deleting chat messages:', chatDeleteError);
    }

    // Update game status
    const { error: updateError } = await supabase
      .from('games')
      .update({
        status: 'completed',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
        platform_fee: platformFee
      })
      .eq('id', gameId);

    if (updateError) throw updateError;

    // Award double stake to winner (same as complete-game logic)
    const winAmount = game.stake_amount * 2;

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
      .eq('id', user.id)
      .single();

    if (loserFetchError) {
      console.error('Error fetching loser profile:', loserFetchError);
      throw loserFetchError;
    }

    // Update winner balance and stats
    const { error: winnerUpdateError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance: (winnerProfile?.wallet_balance || 0) + winAmount,
        games_won: (winnerProfile?.games_won || 0) + 1,
        games_played: (winnerProfile?.games_played || 0) + 1
      })
      .eq('id', winnerId);

    if (winnerUpdateError) {
      console.error('Error updating winner profile:', winnerUpdateError);
      throw winnerUpdateError;
    }

    // Update loser stats
    const { error: loserUpdateError } = await supabase
      .from('profiles')
      .update({ 
        games_played: (loserProfile?.games_played || 0) + 1
      })
      .eq('id', user.id);

    if (loserUpdateError) {
      console.error('Error updating loser profile:', loserUpdateError);
      throw loserUpdateError;
    }

    console.log(`Game ${gameId} resigned by ${user.id}, winner: ${winnerId}`);

    return new Response(
      JSON.stringify({ success: true, winnerId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Resign error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
