import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[admin-manage-subscription] Request received");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[admin-manage-subscription] No auth header");
      return json({ error: "Authorization header required" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) {
      console.log("[admin-manage-subscription] Auth failed:", authError?.message);
      return json({ error: "User not authenticated" }, 401);
    }

    const adminUserId = authData.user.id;
    console.log("[admin-manage-subscription] Admin user:", adminUserId);

    // Admin verification
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from("admin_users")
      .select("is_active, role")
      .eq("user_id", adminUserId)
      .maybeSingle();

    if (adminErr) {
      console.log("[admin-manage-subscription] Admin check error:", adminErr.message);
      return json({ error: "Failed to verify admin" }, 500);
    }
    if (!adminRow?.is_active || adminRow.role !== "master") {
      console.log("[admin-manage-subscription] Not master admin:", adminRow);
      return json({ error: "Forbidden" }, 403);
    }

    // Parse body
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      console.log("[admin-manage-subscription] Invalid JSON body");
      return json({ error: "Invalid JSON body" }, 400);
    }

    console.log("[admin-manage-subscription] Body:", JSON.stringify(body));

    const action = typeof body.action === "string" ? body.action.trim() : "";
    const businessId = typeof body.businessId === "string" ? body.businessId.trim() : "";
    const ownerId = typeof body.ownerId === "string" ? body.ownerId.trim() : "";
    const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim() : null;

    if (!action || !businessId || !ownerId) {
      console.log("[admin-manage-subscription] Missing required fields:", { action, businessId, ownerId });
      return json({ error: "action, businessId e ownerId são obrigatórios" }, 400);
    }

    const nowIso = new Date().toISOString();

    // ─── ACTIVATE ───
    if (action === "activate") {
      const planId = typeof body.planId === "string" ? body.planId.trim() : "";
      const validityDays = Number(body.validityDays);
      const activateBusiness = body.activateBusiness !== false;

      if (!planId) {
        console.log("[admin-manage-subscription] Missing planId");
        return json({ error: "planId é obrigatório" }, 400);
      }
      if (!Number.isFinite(validityDays) || validityDays < 1) {
        console.log("[admin-manage-subscription] Invalid validityDays:", validityDays);
        return json({ error: "validityDays deve ser maior que zero" }, 400);
      }

      const periodEndIso = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString();

      // Fetch plan
      const { data: plan, error: planError } = await supabaseAdmin
        .from("subscription_plans")
        .select("id, name, price_monthly")
        .eq("id", planId)
        .maybeSingle();

      if (planError) {
        console.log("[admin-manage-subscription] Plan fetch error:", planError.message);
        return json({ error: planError.message }, 500);
      }
      if (!plan) {
        console.log("[admin-manage-subscription] Plan not found:", planId);
        return json({ error: "Plano não encontrado" }, 404);
      }

      console.log("[admin-manage-subscription] Plan found:", plan.name);

      // Existing subscription
      const { data: existingSub, error: existingError } = await supabaseAdmin
        .from("business_subscriptions")
        .select("id, payment_gateway")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.log("[admin-manage-subscription] Existing sub error:", existingError.message);
        return json({ error: existingError.message }, 500);
      }

      let subscriptionId: string | null = null;

      if (existingSub?.id) {
        console.log("[admin-manage-subscription] Updating existing subscription:", existingSub.id);
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("business_subscriptions")
          .update({
            plan_id: planId,
            status: "active",
            payment_status: "active",
            payment_gateway: existingSub.payment_gateway || "manual",
            current_period_start: nowIso,
            current_period_end: periodEndIso,
            last_payment_at: nowIso,
            next_payment_at: periodEndIso,
            updated_at: nowIso,
          })
          .eq("id", existingSub.id)
          .select("id")
          .maybeSingle();

        if (updateError) {
          console.log("[admin-manage-subscription] Subscription update error:", updateError.message);
          return json({ error: updateError.message }, 500);
        }
        subscriptionId = updated?.id ?? existingSub.id;
      } else {
        console.log("[admin-manage-subscription] Creating new subscription");
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from("business_subscriptions")
          .insert({
            business_id: businessId,
            plan_id: planId,
            status: "active",
            payment_status: "active",
            payment_gateway: "manual",
            current_period_start: nowIso,
            current_period_end: periodEndIso,
            last_payment_at: nowIso,
            next_payment_at: periodEndIso,
          })
          .select("id")
          .maybeSingle();

        if (insertError) {
          console.log("[admin-manage-subscription] Subscription insert error:", insertError.message);
          return json({ error: insertError.message }, 500);
        }
        subscriptionId = inserted?.id ?? null;
      }

      console.log("[admin-manage-subscription] Subscription ID:", subscriptionId);

      // Activate business
      if (activateBusiness) {
        const { error: businessError } = await supabaseAdmin
          .from("businesses")
          .update({ is_active: true, updated_at: nowIso })
          .eq("id", businessId);

        if (businessError) {
          console.log("[admin-manage-subscription] Business activation error:", businessError.message);
          return json({ error: businessError.message }, 500);
        }
        console.log("[admin-manage-subscription] Business activated");
      }

      // Record transaction
      const { error: txError } = await supabaseAdmin.from("transactions").insert({
        business_id: businessId,
        subscription_id: subscriptionId,
        amount: plan.price_monthly || 0,
        gateway: "manual",
        gateway_transaction_id: `manual_admin_${Date.now()}`,
        payment_method: "manual_admin",
        status: "paid",
        paid_at: nowIso,
        metadata: {
          plan_name: plan.name,
          validity_days: validityDays,
          reason,
          admin_id: adminUserId,
          action: existingSub?.id ? "plan_change" : "manual_activation",
        },
      });

      if (txError) {
        console.log("[admin-manage-subscription] Transaction insert error:", txError.message);
        return json({ error: `Erro ao registrar transação: ${txError.message}` }, 500);
      }

      console.log("[admin-manage-subscription] Transaction recorded");

      // Notification
      const { error: notifError } = await supabaseAdmin.from("notifications").insert({
        user_id: ownerId,
        type: "subscription",
        title: "✅ Plano Atualizado",
        message: `Seu plano foi ${existingSub?.id ? "alterado" : "ativado"} para ${plan.name}. Válido até ${new Date(periodEndIso).toLocaleDateString("pt-BR")}.`,
        metadata: {
          plan_name: plan.name,
          valid_until: periodEndIso,
          business_id: businessId,
        },
      });

      if (notifError) {
        console.log("[admin-manage-subscription] Notification error (non-fatal):", notifError.message);
        // Don't fail the whole operation for a notification error
      }

      console.log("[admin-manage-subscription] ✅ Activation successful");

      return json({
        success: true,
        action,
        subscriptionId,
        planName: plan.name,
        currentPeriodEnd: periodEndIso,
      });
    }

    // ─── CANCEL ───
    if (action === "cancel") {
      const { data: existingSub, error: existingError } = await supabaseAdmin
        .from("business_subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        console.log("[admin-manage-subscription] Cancel - sub fetch error:", existingError.message);
        return json({ error: existingError.message }, 500);
      }
      if (!existingSub?.id) {
        return json({ error: "Assinatura não encontrada" }, 404);
      }

      const { error: updateError } = await supabaseAdmin
        .from("business_subscriptions")
        .update({
          status: "cancelled",
          payment_status: "cancelled",
          updated_at: nowIso,
        })
        .eq("id", existingSub.id);

      if (updateError) {
        console.log("[admin-manage-subscription] Cancel - update error:", updateError.message);
        return json({ error: updateError.message }, 500);
      }

      const { error: businessError } = await supabaseAdmin
        .from("businesses")
        .update({ is_active: false, updated_at: nowIso })
        .eq("id", businessId);

      if (businessError) {
        console.log("[admin-manage-subscription] Cancel - business deactivation error:", businessError.message);
        return json({ error: businessError.message }, 500);
      }

      // Notification (non-fatal)
      await supabaseAdmin.from("notifications").insert({
        user_id: ownerId,
        type: "subscription",
        title: "⚠️ Assinatura Cancelada",
        message: `Sua assinatura foi cancelada pelo administrador. ${reason ? `Motivo: ${reason}` : "Entre em contato com o suporte para mais informações."}`,
        metadata: { business_id: businessId, reason },
      });

      console.log("[admin-manage-subscription] ✅ Cancellation successful");

      return json({ success: true, action, subscriptionId: existingSub.id });
    }

    return json({ error: "Ação inválida. Use 'activate' ou 'cancel'" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-manage-subscription] Unhandled error:", message);
    return json({ error: message }, 500);
  }
});
