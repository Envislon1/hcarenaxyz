
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY') || 'sk_test_15e8f8988e2fb1529ab6f0584fceb3dcc903d92d'
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not set')
  }

  try {
    const { amount, email, type, accountNumber, bankCode } = await req.json()
    
    if (type === 'withdrawal') {
      // First create a transfer recipient
      const recipientResponse = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: "nuban",
          name: email,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: "NGN"
        })
      })

      const recipientData = await recipientResponse.json()
      
      if (!recipientData.status) {
        throw new Error(recipientData.message || 'Failed to create transfer recipient')
      }
      
      // Now initiate the transfer
      const transferResponse = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amount * 100, // Convert to kobo
          recipient: recipientData.data.recipient_code,
          reason: 'Withdrawal from Holocoin'
        })
      })

      const transferData = await transferResponse.json()
      return new Response(JSON.stringify(transferData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Handle deposits by initializing a payment
      const response = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          amount: amount * 100, // Convert to kobo
          callback_url: `${req.headers.get('origin')}/wallet`
        })
      })

      const data = await response.json()
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
