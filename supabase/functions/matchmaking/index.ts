import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchmakingRequest {
  gameType: string;
  stake: number;
  timeLimit: number;
  userId: string;
  totalStakeAmount: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { gameType, stake, timeLimit, userId, totalStakeAmount }: MatchmakingRequest = await req.json()

    console.log('Matchmaking request:', { gameType, stake, timeLimit, userId, totalStakeAmount })

    // Try to find a matching pending game (using service role to bypass RLS)
    const { data: existingGames, error: findError } = await supabaseClient
      .from('games')
      .select('*')
      .eq('game_type', gameType)
      .eq('stake_amount', stake)
      .eq('time_limit', timeLimit)
      .eq('status', 'waiting')
      .is('player2_id', null)
      .neq('player1_id', userId) // Don't match with own game
      .limit(1)

    if (findError) {
      console.error('Error finding games:', findError)
      throw findError
    }

    console.log('Found games:', existingGames)

    // If a matching game exists, join it
    if (existingGames && existingGames.length > 0) {
      const gameToJoin = existingGames[0]
      
      // Deduct stake from player 2's wallet
      const { data: player2Profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single()

      if (profileError || !player2Profile) {
        console.error('Error fetching player 2 profile:', profileError)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch profile' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      if (player2Profile.wallet_balance < totalStakeAmount) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      // Deduct full stake amount (including fee)
      const { error: deductError } = await supabaseClient
        .from('profiles')
        .update({ wallet_balance: player2Profile.wallet_balance - totalStakeAmount })
        .eq('id', userId)

      if (deductError) {
        console.error('Error deducting stake:', deductError)
        return new Response(
          JSON.stringify({ error: 'Failed to deduct stake' }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      const { data: updatedGame, error: joinError } = await supabaseClient
        .from('games')
        .update({
          player2_id: userId,
          status: 'active',
          started_at: new Date().toISOString()
        })
        .eq('id', gameToJoin.id)
        .is('player2_id', null) // Ensure no one else joined
        .select()
        .single()

      if (joinError) {
        console.error('Error joining game:', joinError)
        // Refund stake if join fails
        await supabaseClient
          .from('profiles')
          .update({ wallet_balance: player2Profile.wallet_balance })
          .eq('id', userId)
        
        return new Response(
          JSON.stringify({ matched: false, gameId: null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log('Successfully joined game:', updatedGame.id)
      return new Response(
        JSON.stringify({ matched: true, gameId: updatedGame.id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // No matching game found
    console.log('No matching game found')
    return new Response(
      JSON.stringify({ matched: false, gameId: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Matchmaking error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
