import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

// Verify Mercado Pago webhook signature
async function verifyMercadoPagoSignature(
  xSignature: string | null, 
  xRequestId: string | null, 
  dataId: string,
  secret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId || !secret) {
    return false;
  }

  try {
    // Parse the x-signature header (format: "ts=xxx,v1=xxx")
    const signatureParts: Record<string, string> = {};
    xSignature.split(',').forEach(part => {
      const [key, value] = part.split('=');
      if (key && value) {
        signatureParts[key.trim()] = value.trim();
      }
    });

    const ts = signatureParts['ts'];
    const v1 = signatureParts['v1'];

    if (!ts || !v1) {
      logStep("Invalid signature format", { xSignature });
      return false;
    }

    // Build the manifest string according to MercadoPago documentation
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;

    // Generate HMAC SHA256
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
      encoder.encode(manifest)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return v1 === expectedSignature;
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

    // Get signature headers
    const xSignature = req.headers.get("x-signature");
    const xRequestId = req.headers.get("x-request-id");
    const webhookSecret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");

    const payload = await req.json();
    logStep("Payload received", { type: payload.type, action: payload.action });

    // Verify webhook signature
    const dataId = payload.data?.id?.toString() || '';
    
    if (!webhookSecret) {
      logStep("ERROR: Webhook secret not configured - rejecting request");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    if (!await verifyMercadoPagoSignature(xSignature, xRequestId, dataId, webhookSecret)) {
      logStep("Invalid webhook signature", {
        hasSignature: !!xSignature,
        hasRequestId: !!xRequestId,
      });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Registrar log do webhook
    await supabaseClient
      .from('payment_logs')
      .insert({
        event_type: `${payload.type}.${payload.action}`,
        gateway: 'mercadopago',
        payload: payload
      });

    // Processar pagamento aprovado
    if (payload.type === 'payment' && payload.action === 'payment.created') {
      const paymentId = payload.data?.id;

      if (!paymentId) {
        logStep("No payment ID found");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Buscar detalhes do pagamento na API do Mercado Pago
      const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${mercadoPagoToken}`
        }
      });

      if (!paymentResponse.ok) {
        logStep("Failed to fetch payment details", { paymentId });
        return new Response(JSON.stringify({ error: "Failed to fetch payment" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }

      const payment = await paymentResponse.json();
      logStep("Payment details", { status: payment.status, externalReference: payment.external_reference });

      // Verificar se o pagamento foi aprovado
      if (payment.status !== 'approved') {
        logStep("Payment not approved", { status: payment.status });
        return new Response(JSON.stringify({ received: true, not_approved: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const transactionId = payment.external_reference;

      // Buscar transação
      const { data: transaction, error: transactionError } = await supabaseClient
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (transactionError || !transaction) {
        logStep("Transaction not found", { transactionId });
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      // Verificar se o valor do pagamento corresponde ao valor esperado (com margem de 1 centavo)
      const paidAmount = payment.transaction_amount;
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

      // Calcular taxas do Mercado Pago (4.99% + R$ 0,39)
      const transactionFee = (transaction.amount * 0.0499) + 0.39;
      const netRevenue = transaction.amount - transactionFee;

      // Atualizar transação
      await supabaseClient
        .from('transactions')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          transaction_fee: transactionFee,
          net_revenue: netRevenue,
          metadata: {
            ...transaction.metadata,
            webhook_received_at: new Date().toISOString(),
            payment_id: paymentId,
            payment_method_id: payment.payment_method_id
          }
        })
        .eq('id', transaction.id);

      // Processar confirmação do pagamento
      const { data: result } = await supabaseClient.rpc('process_payment_confirmation', {
        p_transaction_id: transaction.id
      });

      logStep("Payment processed", { result });

      return new Response(JSON.stringify({ received: true, processed: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Outros eventos
    logStep("Event not processed", { type: payload.type, action: payload.action });
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
