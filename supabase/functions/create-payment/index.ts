import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { planId, gateway, businessId } = await req.json();
    if (!planId || !gateway || !businessId) {
      throw new Error("Missing required parameters");
    }
    logStep("Parameters received", { planId, gateway, businessId });

    // SECURITY: Verify caller owns the target business before touching billing rows
    const { data: bizRow, error: bizErr } = await supabaseClient
      .from('businesses')
      .select('id, owner_id')
      .eq('id', businessId)
      .maybeSingle();
    if (bizErr || !bizRow) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (bizRow.owner_id !== user.id) {
      logStep("Ownership check failed", { businessId, userId: user.id });
      return new Response(JSON.stringify({ error: "Forbidden: you do not own this business" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar informações do plano
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      throw new Error("Plan not found");
    }
    logStep("Plan found", { planName: plan.name, price: plan.price_monthly });

    // Buscar ou criar assinatura pendente
    let subscriptionId = null;
    const { data: existingSubscription } = await supabaseClient
      .from('business_subscriptions')
      .select('id')
      .eq('business_id', businessId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingSubscription) {
      subscriptionId = existingSubscription.id;
      logStep("Found existing pending subscription", { subscriptionId });
    } else {
      // Criar nova assinatura pendente
      const { data: newSubscription, error: subscriptionError } = await supabaseClient
        .from('business_subscriptions')
        .insert({
          business_id: businessId,
          plan_id: planId,
          status: 'pending',
          payment_status: 'pending',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 dias
        })
        .select()
        .single();

      if (subscriptionError || !newSubscription) {
        logStep("Failed to create subscription", { error: subscriptionError });
        throw new Error("Failed to create subscription");
      }

      subscriptionId = newSubscription.id;
      logStep("Subscription created", { subscriptionId });
    }

    // Criar transação pendente
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        business_id: businessId,
        subscription_id: subscriptionId,
        amount: plan.price_monthly,
        gateway: gateway,
        payment_method: gateway === 'abacatepay' ? 'pix' : 'credit_card',
        status: 'pending',
        metadata: {
          plan_id: planId,
          plan_name: plan.name,
          user_email: user.email
        }
      })
      .select()
      .single();

    if (transactionError || !transaction) {
      throw new Error("Failed to create transaction");
    }
    logStep("Transaction created", { transactionId: transaction.id });

    let paymentResponse;

    if (gateway === 'abacatepay') {
      // Criar pagamento PIX via AbacatePay
      const abacatePayApiKey = Deno.env.get("ABACATEPAY_API_KEY");
      if (!abacatePayApiKey) {
        throw new Error("AbacatePay API key not configured");
      }

      const abacatePayResponse = await fetch('https://api.abacatepay.com/v1/billing/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${abacatePayApiKey}`
        },
        body: JSON.stringify({
          frequency: 'ONE_TIME',
          methods: ['PIX'],
          products: [{
            externalId: transaction.id,
            name: `Assinatura ${plan.name} - Ofertivo`,
            description: `Plano ${plan.name} do Ofertivo`,
            quantity: 1,
            price: Math.round(plan.price_monthly * 100) // Converter para centavos
          }],
          returnUrl: `${req.headers.get("origin")}/anunciante/pagamento-sucesso`,
          completionUrl: `${req.headers.get("origin")}/anunciante/pagamento-sucesso`,
          metadata: {
            transaction_id: transaction.id,
            user_id: user.id,
            business_id: businessId
          }
        })
      });

      if (!abacatePayResponse.ok) {
        const errorText = await abacatePayResponse.text();
        logStep("AbacatePay API error", { status: abacatePayResponse.status, error: errorText });
        throw new Error("Failed to create AbacatePay payment");
      }

      paymentResponse = await abacatePayResponse.json();
      logStep("AbacatePay payment created", { billId: paymentResponse.data?.id, url: paymentResponse.data?.url });

      // Atualizar transação com dados do AbacatePay
      await supabaseClient
        .from('transactions')
        .update({
          gateway_transaction_id: paymentResponse.data?.id,
          gateway_payment_url: paymentResponse.data?.url,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        })
        .eq('id', transaction.id);

      return new Response(JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        payment_url: paymentResponse.data?.url,
        gateway: 'abacatepay'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } else if (gateway === 'mercadopago') {
      // Criar pagamento via Mercado Pago
      const mercadoPagoToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!mercadoPagoToken) {
        throw new Error("Mercado Pago access token not configured");
      }

      const mercadoPagoResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mercadoPagoToken}`
        },
        body: JSON.stringify({
          items: [{
            title: `Assinatura ${plan.name} - Ofertivo`,
            description: `Plano ${plan.name} do Ofertivo`,
            quantity: 1,
            unit_price: plan.price_monthly,
            currency_id: 'BRL'
          }],
          payer: {
            email: user.email
          },
          back_urls: {
            success: `${req.headers.get("origin")}/anunciante/dashboard?payment=success`,
            failure: `${req.headers.get("origin")}/anunciante/dashboard?payment=failed`,
            pending: `${req.headers.get("origin")}/anunciante/dashboard?payment=pending`
          },
          auto_return: 'approved',
          external_reference: transaction.id,
          metadata: {
            transaction_id: transaction.id,
            user_id: user.id,
            business_id: businessId
          }
        })
      });

      if (!mercadoPagoResponse.ok) {
        const errorText = await mercadoPagoResponse.text();
        logStep("Mercado Pago API error", { status: mercadoPagoResponse.status, error: errorText });
        throw new Error("Failed to create Mercado Pago payment");
      }

      paymentResponse = await mercadoPagoResponse.json();
      logStep("Mercado Pago payment created", { preferenceId: paymentResponse.id });

      // Atualizar transação com dados do Mercado Pago
      await supabaseClient
        .from('transactions')
        .update({
          gateway_transaction_id: paymentResponse.id,
          gateway_payment_url: paymentResponse.init_point,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
        })
        .eq('id', transaction.id);

      return new Response(JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        payment_url: paymentResponse.init_point,
        gateway: 'mercadopago'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    throw new Error("Invalid gateway");

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
