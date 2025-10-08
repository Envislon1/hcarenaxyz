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

  const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')
  if (!PAYSTACK_SECRET_KEY) {
    console.error('PAYSTACK_SECRET_KEY is not set')
    return new Response(
      JSON.stringify({ error: 'Payment service not configured' }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }

  try {
    const { amount, email, type, accountNumber, bankCode } = await req.json()
    console.log(`Processing ${type} request for ${email}, amount: ${amount}`)
    
    if (type === 'withdrawal') {
      // First create a transfer recipient
      console.log('Creating transfer recipient...')
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
      console.log('Recipient response:', recipientData)
      
      if (!recipientData.status) {
        throw new Error(recipientData.message || 'Failed to create transfer recipient')
      }
      
      // Now initiate the transfer
      console.log('Initiating transfer...')
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
      console.log('Transfer response:', transferData)
      return new Response(JSON.stringify(transferData), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } else {
      // Handle deposits by initializing a payment
      console.log('Initializing payment...')
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
      console.log('Payment initialization response:', data)
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Paystack function error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
