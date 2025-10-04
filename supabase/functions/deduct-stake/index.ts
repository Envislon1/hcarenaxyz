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

    const { playerId, stakeAmount } = await req.json();

    console.log('Deducting stake:', { playerId, stakeAmount });

    // Get player's current balance
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('wallet_balance')
      .eq('id', playerId)
      .single();

    if (fetchError) {
      console.error('Error fetching profile:', fetchError);
      throw fetchError;
    }

    // Check if sufficient balance
    if (!profile || profile.wallet_balance < stakeAmount) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Deduct stake from wallet
    const newBalance = profile.wallet_balance - stakeAmount;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', playerId);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw updateError;
    }

    console.log('Stake deducted successfully:', { playerId, oldBalance: profile.wallet_balance, newBalance });

    return new Response(
      JSON.stringify({ success: true, newBalance }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in deduct-stake function:', error);
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
