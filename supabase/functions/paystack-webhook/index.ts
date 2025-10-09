import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error('PAYSTACK_SECRET_KEY secret is not set')
    }

    // Verify webhook signature
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      console.error('No signature provided')
      return new Response(JSON.stringify({ error: 'No signature provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const body = await req.text()
    
    // Verify the signature using HMAC-SHA512
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(PAYSTACK_SECRET_KEY),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(body)
    )
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== expectedSignature) {
      console.error('Invalid signature. Expected:', expectedSignature, 'Received:', signature)
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    const event = JSON.parse(body)
    console.log('Webhook event received:', event.event, 'Event data:', JSON.stringify(event, null, 2))

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different event types
    if (event.event === 'charge.success') {
      const { data: eventData } = event
      const reference = eventData.reference
      const amount = eventData.amount / 100 // Convert from kobo to naira
      const email = eventData.customer.email

      console.log(`Processing successful charge: ${reference} for ${amount} NGN`)

      // Find the pending transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('payment_reference', reference)
        .eq('status', 'pending')
        .single()

      if (txError || !transaction) {
        console.error('Transaction not found:', txError)
        return new Response(JSON.stringify({ error: 'Transaction not found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        })
      }

      // Get conversion rate
      const { data: settings } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'currency_conversion')
        .single()

      const conversionRate = settings?.setting_value?.naira_per_holocoin || 306
      const holocoins = amount / conversionRate

      // Update transaction status and set completion timestamp
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', transaction.id)

      if (updateTxError) {
        console.error('Error updating transaction:', updateTxError)
        throw updateTxError
      }

      // Update user wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', transaction.user_id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        throw profileError
      }

      const newBalance = Number(profile.wallet_balance) + holocoins

      const { error: updateBalanceError } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', transaction.user_id)

      if (updateBalanceError) {
        console.error('Error updating wallet balance:', updateBalanceError)
        throw updateBalanceError
      }

      console.log(`Wallet updated: User ${transaction.user_id} - New balance: ${newBalance} HC`)
    } else if (event.event === 'transfer.success' || event.event === 'transfer.failed') {
      const { data: eventData } = event
      const reference = eventData.reference
      const status = event.event === 'transfer.success' ? 'completed' : 'failed'

      console.log(`Processing transfer ${status}: ${reference}`)

      // Update transaction status
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({ status })
        .eq('payment_reference', reference)

      if (updateTxError) {
        console.error('Error updating transaction:', updateTxError)
        throw updateTxError
      }

      // If transfer failed, refund the amount to user's wallet
      if (status === 'failed') {
        const { data: transaction } = await supabase
          .from('transactions')
          .select('user_id, amount')
          .eq('payment_reference', reference)
          .single()

        if (transaction) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', transaction.user_id)
            .single()

          if (profile) {
            const newBalance = Number(profile.wallet_balance) + Number(transaction.amount)
            await supabase
              .from('profiles')
              .update({ wallet_balance: newBalance })
              .eq('id', transaction.user_id)

            console.log(`Refunded ${transaction.amount} HC to user ${transaction.user_id}`)
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Webhook error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
