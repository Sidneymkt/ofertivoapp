import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-PAYMENT-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { transactionId } = await req.json();
    if (!transactionId) throw new Error("Transaction ID is required");

    logStep("Checking transaction", { transactionId });

    // Buscar transação
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .select(`
        *,
        business:businesses(id, owner_id)
      `)
      .eq('id', transactionId)
      .single();

    if (transactionError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Verificar se o usuário é o dono do negócio
    if (transaction.business.owner_id !== user.id) {
      throw new Error("Unauthorized");
    }

    logStep("Transaction found", { status: transaction.status, gateway: transaction.gateway });

    // Se já está pago, retornar status
    if (transaction.status === 'paid') {
      return new Response(JSON.stringify({
        status: 'paid',
        transaction: transaction
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se expirou, verificar fallback
    if (transaction.status === 'expired' || 
        (transaction.gateway === 'abacatepay' && 
         new Date(transaction.created_at).getTime() < Date.now() - 10 * 60 * 1000)) {
      
      return new Response(JSON.stringify({
        status: 'expired',
        fallback_available: true,
        transaction: transaction
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Consultar status diretamente no gateway
    if (transaction.gateway === 'abacatepay' && transaction.gateway_transaction_id) {
      const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
      const statusResponse = await fetch(
        `https://api.abacatepay.com/v1/billing/${transaction.gateway_transaction_id}`,
        {
          headers: {
            'Authorization': `Bearer ${abacatePayApiKey}`
          }
        }
      );

      if (statusResponse.ok) {
        const billData = await statusResponse.json();
        logStep("AbacatePay status", { status: billData.status });

        if (billData.status === 'PAID') {
          // Processar pagamento
          await supabaseClient.rpc('process_payment_confirmation', {
            p_transaction_id: transaction.id
          });

          return new Response(JSON.stringify({
            status: 'paid',
            transaction: { ...transaction, status: 'paid' }
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      }
    }

    // Retornar status atual
    return new Response(JSON.stringify({
      status: transaction.status,
      transaction: transaction
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
