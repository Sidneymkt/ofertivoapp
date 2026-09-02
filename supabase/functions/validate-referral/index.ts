import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { code } = await req.json()

    console.log('Validating referral code:', code)

    if (!code || typeof code !== 'string' || code.trim().length < 4) {
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Código de indicação inválido',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Chamar função do banco para validar
    const { data, error } = await supabaseClient.rpc('validate_referral_code', {
      p_code: code.trim(),
    })

    if (error) {
      console.error('Error validating code:', error)
      return new Response(
        JSON.stringify({
          valid: false,
          message: 'Erro ao validar código',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('Validation result:', data)

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in validate-referral function:', error)
    return new Response(
      JSON.stringify({
        valid: false,
        message: 'Erro interno ao validar código',
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
