import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-CAKTO-PAYMENT] ${step}${detailsStr}`);
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

    // Autenticar usuário
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData } = await supabaseClient.auth.getUser(token);
    const user = authData.user;
    
    if (!user?.id) {
      throw new Error("User not authenticated");
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    const body = await req.json();
    const { planName, businessId } = body;

    logStep("Request params", { planName, businessId });

    // Validate that the businessId belongs to the authenticated user
    const { data: ownedBusiness, error: ownerError } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .eq('owner_id', user.id)
      .maybeSingle();

    if (!ownedBusiness) {
      logStep("Business does not belong to user", { businessId, userId: user.id });
      return new Response(JSON.stringify({ error: 'Forbidden: Business does not belong to user' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    // Verificar se já existe assinatura ativa
    const { data: existingSubscription, error: subError } = await supabaseClient
      .from('business_subscriptions')
      .select(`
        id,
        status,
        payment_status,
        plan_id,
        current_period_end,
        subscription_plans!inner(name)
      `)
      .eq('business_id', businessId)
      .in('status', ['active', 'trialing'])
      .in('payment_status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSubscription) {
      logStep("Active subscription found", { subscriptionId: existingSubscription.id });
      
      // Ativar negócio se necessário
      await supabaseClient
        .from('businesses')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', businessId);

      return new Response(JSON.stringify({
        success: true,
        hasActiveSubscription: true,
        planName: (existingSubscription.subscription_plans as any)?.name || 'Plano Ativo',
        currentPeriodEnd: existingSubscription.current_period_end
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se não encontrou assinatura ativa, verificar via API da Cakto (polling/fallback)
    const clientId = Deno.env.get("CAKTO_CLIENT_ID");
    const clientSecret = Deno.env.get("CAKTO_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
      logStep("Cakto credentials not configured");
      return new Response(JSON.stringify({
        success: true,
        hasActiveSubscription: false,
        message: 'No active subscription found'
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Tentar autenticar na API da Cakto para verificar pagamentos
    try {
      // Buscar token de acesso da Cakto
      const tokenResponse = await fetch('https://api.cakto.com.br/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (!tokenResponse.ok) {
        logStep("Failed to get Cakto token", { status: tokenResponse.status });
        return new Response(JSON.stringify({
          success: true,
          hasActiveSubscription: false,
          message: 'Could not verify with Cakto API'
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Buscar compras do usuário pelo email
      const purchasesResponse = await fetch(`https://api.cakto.com.br/v1/purchases?email=${encodeURIComponent(user.email || '')}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (purchasesResponse.ok) {
        const purchasesData = await purchasesResponse.json();
        logStep("Cakto purchases", { count: purchasesData?.data?.length || 0 });

        // Verificar se há compra aprovada recente
        const purchases = purchasesData?.data || [];
        const recentApprovedPurchase = purchases.find((p: any) => 
          p.status === 'approved' || p.status === 'paid'
        );

        if (recentApprovedPurchase) {
          logStep("Found approved purchase via API", { purchase: recentApprovedPurchase });

          // Extrair nome do plano
          let detectedPlanName = planName || 'Start';
          if (recentApprovedPurchase.product_name) {
            const productName = recentApprovedPurchase.product_name.toLowerCase();
            if (productName.includes('premium')) detectedPlanName = 'Premium';
            else if (productName.includes('pro')) detectedPlanName = 'Pro';
            else if (productName.includes('essencial')) detectedPlanName = 'Essencial';
            else if (productName.includes('start')) detectedPlanName = 'Start';
          }

          // Buscar plano no banco
          const { data: plan } = await supabaseClient
            .from('subscription_plans')
            .select('*')
            .ilike('name', detectedPlanName)
            .maybeSingle();

          if (plan) {
            // Criar/Atualizar assinatura
            const currentPeriodStart = new Date().toISOString();
            const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            await supabaseClient
              .from('business_subscriptions')
              .upsert({
                business_id: businessId,
                plan_id: plan.id,
                status: 'active',
                payment_status: 'active',
                payment_gateway: 'cakto',
                current_period_start: currentPeriodStart,
                current_period_end: currentPeriodEnd,
                last_payment_at: new Date().toISOString(),
                next_payment_at: currentPeriodEnd,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'business_id'
              });

            // Ativar negócio
            await supabaseClient
              .from('businesses')
              .update({ is_active: true, updated_at: new Date().toISOString() })
              .eq('id', businessId);

            logStep("Subscription created/updated via API fallback");

            return new Response(JSON.stringify({
              success: true,
              hasActiveSubscription: true,
              planName: plan.name,
              currentPeriodEnd,
              activatedVia: 'api_fallback'
            }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            });
          }
        }
      }
    } catch (caktoError) {
      logStep("Cakto API error", { error: caktoError });
    }

    // Nenhuma assinatura encontrada
    return new Response(JSON.stringify({
      success: true,
      hasActiveSubscription: false,
      message: 'No active subscription found'
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
