import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CAKTO-WEBHOOK] ${step}${detailsStr}`);
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
    logStep("Webhook received");

    // Validate webhook security token (REQUIRED)
    const webhookSecret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
    if (!webhookSecret) {
      logStep("CAKTO_WEBHOOK_SECRET not configured - rejecting request");
      return new Response(JSON.stringify({ error: "Webhook not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const authToken = req.headers.get("x-webhook-secret") || 
                      req.headers.get("x-cakto-signature") ||
                      req.headers.get("authorization")?.replace("Bearer ", "") ||
                      new URL(req.url).searchParams.get("token");
    if (authToken !== webhookSecret) {
      logStep("Invalid webhook secret - unauthorized request blocked");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload = await req.json();
    logStep("Payload received", payload);

    const { 
      event, 
      status, 
      payment_status,
      customer_email,
      customer_name,
      product_name,
      transaction_id,
      metadata,
      amount,
      // Additional Cakto fields
      order_id,
      subscription_id: caktoSubscriptionId,
    } = payload;

    // Check if payment is approved
    const isPaymentApproved = 
      status === 'paid' || 
      status === 'approved' || 
      payment_status === 'paid' ||
      payment_status === 'approved' ||
      event === 'payment.approved' ||
      event === 'subscription.created' ||
      event === 'purchase.approved' ||
      event === 'SALE_APPROVED';

    if (!isPaymentApproved) {
      logStep("Payment not approved, notifying admins", { status, payment_status, event });
      
      // Notify admins about webhook event (even if not approved)
      if (event === 'payment.refused' || event === 'payment.failed' || status === 'refused') {
        await notifyAdmins(supabaseClient, {
          type: 'payment_failed',
          title: '❌ Pagamento Recusado - Cakto',
          message: `Pagamento recusado para ${customer_email || 'email desconhecido'}. Produto: ${product_name || 'N/A'}. Evento: ${event || status}`,
          metadata: { customer_email, product_name, event, status }
        });
      }

      return new Response(JSON.stringify({ success: true, message: 'Event processed' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Payment approved, processing", { customer_email, product_name });

    // Map product name to plan
    const planMapping: Record<string, string> = {
      'Start': 'Start',
      'Essencial': 'Essencial',
      'Pro': 'Pro',
      'Premium': 'Premium',
      'start': 'Start',
      'essencial': 'Essencial',
      'pro': 'Pro',
      'premium': 'Premium',
    };

    let planName = 'Start';
    if (product_name) {
      for (const [key, value] of Object.entries(planMapping)) {
        if (product_name.toLowerCase().includes(key.toLowerCase())) {
          planName = value;
          break;
        }
      }
    }
    logStep("Plan identified", { planName, product_name });

    // Get plan from database
    const { data: plan, error: planError } = await supabaseClient
      .from('subscription_plans')
      .select('*')
      .ilike('name', planName)
      .maybeSingle();

    if (planError || !plan) {
      logStep("Plan not found, trying default", { planName, error: planError });
      const { data: defaultPlan } = await supabaseClient
        .from('subscription_plans')
        .select('*')
        .order('price_monthly', { ascending: true })
        .limit(1)
        .maybeSingle();
      
      if (!defaultPlan) {
        throw new Error("No subscription plans available");
      }
    }

    const selectedPlan = plan || null;
    if (!selectedPlan) {
      throw new Error("Could not determine subscription plan");
    }

    // Find user by email
    let userId: string | null = null;
    
    if (customer_email) {
      const { data: userData } = await supabaseClient.auth.admin.listUsers();
      if (userData?.users) {
        const user = userData.users.find(u => u.email?.toLowerCase() === customer_email?.toLowerCase());
        userId = user?.id || null;
      }
    }

    if (!userId && metadata?.user_id) {
      userId = metadata.user_id;
    }
    
    if (!userId && metadata?.business_id) {
      const { data: businessData } = await supabaseClient
        .from('businesses')
        .select('owner_id')
        .eq('id', metadata.business_id)
        .maybeSingle();
      userId = businessData?.owner_id || null;
    }

    if (!userId) {
      logStep("Cannot identify user", { customer_email, metadata });
      
      // Notify admins about unmatched payment
      await notifyAdmins(supabaseClient, {
        type: 'webhook_error',
        title: '⚠️ Pagamento sem Usuário - Cakto',
        message: `Pagamento aprovado mas usuário não encontrado. Email: ${customer_email || 'N/A'}. Plano: ${planName}. Necessita liberação manual.`,
        metadata: { customer_email, product_name, planName, transaction_id }
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'User not found - admin notified' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("User identified", { userId });

    // Find user's business
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id, is_active, name')
      .eq('owner_id', userId)
      .maybeSingle();

    if (businessError || !business) {
      logStep("Business not found", { userId, error: businessError });
      
      await notifyAdmins(supabaseClient, {
        type: 'webhook_error',
        title: '⚠️ Pagamento sem Negócio - Cakto',
        message: `Pagamento aprovado para ${customer_email} mas negócio não cadastrado. Plano: ${planName}. Necessita verificação.`,
        metadata: { userId, customer_email, planName }
      });

      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Business not found for user - admin notified' 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Business found", { businessId: business.id, businessName: business.name });

    // Prevent duplicate activation: check if already active with same plan
    const { data: currentSub } = await supabaseClient
      .from('business_subscriptions')
      .select('id, plan_id, status, payment_status, current_period_end')
      .eq('business_id', business.id)
      .maybeSingle();

    if (currentSub?.plan_id === selectedPlan.id && 
        currentSub?.status === 'active' && 
        currentSub?.payment_status === 'active' &&
        currentSub?.current_period_end && 
        new Date(currentSub.current_period_end) > new Date()) {
      logStep("Already active with same plan, extending period");
      // Extend the period instead of creating duplicate
      const newEnd = new Date(currentSub.current_period_end);
      newEnd.setDate(newEnd.getDate() + 30);
      
      await supabaseClient
        .from('business_subscriptions')
        .update({
          current_period_end: newEnd.toISOString(),
          last_payment_at: new Date().toISOString(),
          next_payment_at: newEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentSub.id);

      logStep("Period extended", { newEnd: newEnd.toISOString() });
    } else {
      // Calculate subscription period (30 days)
      const currentPeriodStart = new Date().toISOString();
      const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      if (currentSub) {
        // Update existing subscription
        const { error: updateError } = await supabaseClient
          .from('business_subscriptions')
          .update({
            plan_id: selectedPlan.id,
            status: 'active',
            payment_status: 'active',
            payment_gateway: 'cakto',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            last_payment_at: new Date().toISOString(),
            next_payment_at: currentPeriodEnd,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSub.id);

        if (updateError) {
          logStep("Error updating subscription", { error: updateError });
          throw updateError;
        }
        logStep("Subscription updated");
      } else {
        // Create new subscription
        const { error: insertError } = await supabaseClient
          .from('business_subscriptions')
          .insert({
            business_id: business.id,
            plan_id: selectedPlan.id,
            status: 'active',
            payment_status: 'active',
            payment_gateway: 'cakto',
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            last_payment_at: new Date().toISOString(),
            next_payment_at: currentPeriodEnd
          });

        if (insertError) {
          logStep("Error creating subscription", { error: insertError });
          throw insertError;
        }
        logStep("New subscription created");
      }
    }

    // Activate business automatically
    if (!business.is_active) {
      const { error: activateError } = await supabaseClient
        .from('businesses')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', business.id);

      if (activateError) {
        logStep("Error activating business", { error: activateError });
      } else {
        logStep("Business activated");
      }
    }

    // Record transaction
    try {
      await supabaseClient
        .from('transactions')
        .insert({
          business_id: business.id,
          amount: amount || selectedPlan.price_monthly || 0,
          gateway: 'cakto',
          gateway_transaction_id: transaction_id || order_id || `cakto_${Date.now()}`,
          payment_method: 'external',
          status: 'paid',
          paid_at: new Date().toISOString(),
          metadata: {
            plan_id: selectedPlan.id,
            plan_name: selectedPlan.name,
            customer_email,
            customer_name,
            product_name,
            cakto_event: event,
            cakto_subscription_id: caktoSubscriptionId
          }
        });
      logStep("Transaction recorded");
    } catch (txError) {
      logStep("Error recording transaction (non-blocking)", { error: txError });
    }

    // Notify user
    await supabaseClient
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'payment',
        title: '🎉 Pagamento Confirmado!',
        message: `Sua assinatura do plano ${selectedPlan.name} foi ativada com sucesso! Agora você pode criar ofertas e sorteios.`,
        metadata: {
          plan_name: selectedPlan.name,
          business_id: business.id,
          max_offers: selectedPlan.max_offers,
          max_raffles: selectedPlan.max_raffles
        }
      });

    // Notify admins about successful payment
    await notifyAdmins(supabaseClient, {
      type: 'payment_confirmed',
      title: '💰 Novo Pagamento Confirmado',
      message: `${business.name} ativou o plano ${selectedPlan.name} (R$ ${selectedPlan.price_monthly}). Email: ${customer_email || 'N/A'}.`,
      metadata: {
        business_id: business.id,
        business_name: business.name,
        plan_name: selectedPlan.name,
        amount: selectedPlan.price_monthly,
        customer_email
      }
    });

    logStep("All done successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Payment processed successfully',
      business_id: business.id,
      plan: selectedPlan.name
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    // Notify admins about webhook error
    try {
      await notifyAdmins(supabaseClient, {
        type: 'webhook_error',
        title: '🔴 Erro no Webhook Cakto',
        message: `Erro ao processar webhook: ${errorMessage}`,
        metadata: { error: errorMessage }
      });
    } catch (_) {}

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper: Notify all active admin users
async function notifyAdmins(
  supabase: any,
  notification: {
    type: string;
    title: string;
    message: string;
    metadata?: any;
  }
) {
  try {
    const { data: admins } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('is_active', true);

    if (!admins || admins.length === 0) return;

    const notifications = admins.map((admin: any) => ({
      user_id: admin.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      metadata: notification.metadata || {},
    }));

    await supabase.from('notifications').insert(notifications);
    logStep("Admin notifications sent", { count: admins.length });
  } catch (error) {
    logStep("Error sending admin notifications", { error });
  }
}