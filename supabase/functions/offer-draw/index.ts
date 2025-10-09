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

    const { gameId, accept } = await req.json();

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

    if (accept) {
      // Delete chat messages for this game
      const { error: chatDeleteError } = await supabase
        .from('chat_messages')
        .delete()
        .eq('game_id', gameId);
      
      if (chatDeleteError) {
        console.error('Error deleting chat messages:', chatDeleteError);
      }

      // Complete game as draw - return stakes minus holo fee to both players
      const { error: updateError } = await supabase
        .from('games')
        .update({
          status: 'completed',
          winner_id: null, // null indicates draw
          completed_at: new Date().toISOString()
        })
        .eq('id', gameId);

      if (updateError) throw updateError;

      // Return original stake to both players (minus holo fee already deducted at game start)
      const returnAmount = game.stake_amount;

      // Update player 1 balance
      const { data: player1Profile, error: player1FetchError } = await supabase
        .from('profiles')
        .select('wallet_balance, games_played')
        .eq('id', game.player1_id)
        .single();

      if (player1FetchError) {
        console.error('Error fetching player1 profile:', player1FetchError);
        throw player1FetchError;
      }

      if (player1Profile) {
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: player1Profile.wallet_balance + returnAmount,
            games_played: (player1Profile.games_played || 0) + 1
          })
          .eq('id', game.player1_id);
      }

      // Update player 2 balance
      const { data: player2Profile, error: player2FetchError } = await supabase
        .from('profiles')
        .select('wallet_balance, games_played')
        .eq('id', game.player2_id)
        .single();

      if (player2FetchError) {
        console.error('Error fetching player2 profile:', player2FetchError);
        throw player2FetchError;
      }

      if (player2Profile) {
        await supabase
          .from('profiles')
          .update({ 
            wallet_balance: player2Profile.wallet_balance + returnAmount,
            games_played: (player2Profile.games_played || 0) + 1
          })
          .eq('id', game.player2_id);
      }

      console.log(`Game ${gameId} ended in draw`);

      return new Response(
        JSON.stringify({ success: true, draw: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Delete the draw offer when declined
      const { error: deleteError } = await supabase
        .from('draw_offers')
        .delete()
        .eq('game_id', gameId)
        .eq('status', 'pending');

      if (deleteError) {
        console.error('Error deleting draw offer:', deleteError);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Draw offer error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
