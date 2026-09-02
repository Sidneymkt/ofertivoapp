import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ABACATEPAY-WEBHOOK] ${step}${detailsStr}`);
};

// Verify webhook signature using HMAC SHA256
async function verifyWebhookSignature(payload: string, signature: string | null, secret: string): Promise<boolean> {
  if (!signature || !secret) {
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    logStep("Signature verification error", { error: String(error) });
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Webhook received");

    // Get webhook signature from headers
    const webhookSignature = req.headers.get("x-webhook-signature");
    const webhookSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET");

    // Read raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature
    if (!webhookSecret) {
      logStep("ERROR: Webhook secret not configured - rejecting request");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!await verifyWebhookSignature(rawBody, webhookSignature, webhookSecret)) {
      logStep("Invalid webhook signature", { hasSignature: !!webhookSignature });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload = JSON.parse(rawBody);
    logStep("Payload received", { event: payload.event, billId: payload.data?.id });

    // Registrar log do webhook para auditoria
    await supabaseClient
      .from('payment_logs')
      .insert({
        event_type: payload.event || 'unknown',
        gateway: 'abacatepay',
        payload: payload
      });

    // Processar evento de pagamento confirmado
    if (payload.event === 'billing.paid') {
      const billId = payload.data?.id;
      const externalId = payload.data?.products?.[0]?.externalId;

      if (!externalId) {
        logStep("No external ID found in webhook");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Buscar transação
      const { data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', externalId)
        .single();

      if (transactionError || !transaction) {
        logStep("Transaction not found", { externalId });
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      logStep("Transaction found", { transactionId: transaction.id, status: transaction.status });

      // Verificar se o valor do pagamento corresponde ao valor esperado
      const paidAmount = payload.data?.amount || payload.data?.value;
      if (paidAmount && Math.abs(paidAmount - transaction.amount) > 0.01) {
        logStep("Amount mismatch detected", { 
          expected: transaction.amount, 
          received: paidAmount 
        });
        return new Response(JSON.stringify({ error: "Amount mismatch" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Se já foi processada, retornar sucesso
      if (transaction.status === 'paid') {
        logStep("Transaction already processed");
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Calcular taxas (AbacatePay: 0.99% + R$ 0,10)
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
            webhook_received_at: new Date().toISOString(),
            bill_id: billId
          }
        })
        .eq('id', transaction.id);

      if (updateError) {
        logStep("Error updating transaction", { error: updateError });
        throw new Error("Failed to update transaction");
      }

      logStep("Transaction updated successfully");

      // Processar confirmação do pagamento (ativar assinatura)
      if (transaction.subscription_id) {
        logStep("Activating subscription", { subscriptionId: transaction.subscription_id });
        
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
          throw new Error("Failed to activate subscription");
        }

        logStep("Subscription activated successfully");
        
        // Criar notificação de sucesso
        const { data: business } = await supabaseClient
          .from('businesses')
          .select('owner_id')
          .eq('id', transaction.business_id)
          .single();

        if (business?.owner_id) {
          await supabaseClient.rpc('create_notification', {
            p_user_id: business.owner_id,
            p_title: 'Pagamento Confirmado! 💳',
            p_message: `Seu pagamento de R$ ${transaction.amount.toFixed(2)} foi confirmado e sua assinatura está ativa.`,
            p_type: 'payment_confirmed',
            p_metadata: {
              transaction_id: transaction.id,
              amount: transaction.amount,
              gateway: 'abacatepay'
            },
            p_related_id: transaction.business_id
          });
        }
      }

      logStep("Payment processed successfully");

      return new Response(JSON.stringify({ received: true, processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Outros eventos
    logStep("Event not processed", { event: payload.event });
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
