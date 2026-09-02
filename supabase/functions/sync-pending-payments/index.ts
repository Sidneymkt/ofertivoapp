import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-PENDING-PAYMENTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayApiKey) {
      throw new Error("AbacatePay API key not configured");
    }

    // Buscar transações pendentes (últimos 7 dias)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingTransactions, error: transactionsError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('gateway', 'abacatepay')
      .eq('status', 'pending')
      .gte('created_at', sevenDaysAgo)
      .not('gateway_transaction_id', 'is', null);

    if (transactionsError) {
      logStep("Error fetching pending transactions", { error: transactionsError });
      throw transactionsError;
    }

    logStep("Pending transactions found", { count: pendingTransactions?.length || 0 });

    let syncedCount = 0;
    let errors = [];

    // Verificar cada transação no AbacatePay
    for (const transaction of pendingTransactions || []) {
      try {
        logStep("Checking transaction", { transactionId: transaction.id, billId: transaction.gateway_transaction_id });

        const response = await fetch(`https://api.abacatepay.com/v1/billing/info/${transaction.gateway_transaction_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${abacatePayApiKey}`
          }
        });

        if (!response.ok) {
          logStep("Error fetching bill info", { status: response.status });
          continue;
        }

        const billData = await response.json();
        const billStatus = billData.data?.status;

        logStep("Bill status", { billId: transaction.gateway_transaction_id, status: billStatus });

        // Se o pagamento foi aprovado, processar
        if (billStatus === 'PAID') {
          logStep("Payment confirmed, processing", { transactionId: transaction.id });

          // Calcular taxas
          const transactionFee = (transaction.amount * 0.0099) + 0.10;
          const netRevenue = transaction.amount - transactionFee;

          // Atualizar transação
          const { error: updateError } = await supabaseClient
            .from('transactions')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              transaction_fee: transactionFee,
              net_revenue: netRevenue,
              metadata: {
                ...transaction.metadata,
                synced_at: new Date().toISOString(),
                bill_status: billStatus
              }
            })
            .eq('id', transaction.id);

          if (updateError) {
            logStep("Error updating transaction", { error: updateError });
            errors.push({ transactionId: transaction.id, error: updateError });
            continue;
          }

          // Ativar assinatura
          if (transaction.subscription_id) {
            const { error: subError } = await supabaseClient
              .from('business_subscriptions')
              .update({
                status: 'active',
                payment_status: 'active',
                payment_gateway: 'abacatepay',
                payment_method: 'pix',
                last_payment_at: new Date().toISOString(),
                next_payment_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                current_period_start: new Date().toISOString(),
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              })
              .eq('id', transaction.subscription_id);

            if (subError) {
              logStep("Error activating subscription", { error: subError });
              errors.push({ transactionId: transaction.id, subscriptionError: subError });
            } else {
              logStep("Subscription activated", { subscriptionId: transaction.subscription_id });

              // Criar notificação
              const { data: business } = await supabaseClient
                .from('businesses')
                .select('owner_id')
                .eq('id', transaction.business_id)
                .single();

              if (business) {
                await supabaseClient.rpc('create_notification', {
                  p_user_id: business.owner_id,
                  p_title: '✅ Assinatura Ativada!',
                  p_message: `Seu pagamento foi confirmado e sua assinatura está ativa. Bem-vindo ao Ofertivo!`,
                  p_type: 'payment_confirmed',
                  p_metadata: {
                    transaction_id: transaction.id,
                    amount: transaction.amount,
                    gateway: 'abacatepay',
                    synced: true
                  },
                  p_related_id: transaction.business_id
                });
              }

              syncedCount++;
            }
          }
        }
      } catch (error) {
        logStep("Error processing transaction", { transactionId: transaction.id, error: error.message });
        errors.push({ transactionId: transaction.id, error: error.message });
      }
    }

    logStep("Sync completed", { synced: syncedCount, errors: errors.length });

    return new Response(JSON.stringify({
      success: true,
      synced: syncedCount,
      errors: errors.length > 0 ? errors : undefined
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