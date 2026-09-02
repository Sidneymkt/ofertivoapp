import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await supabaseAdmin.auth.getUser(token);
    if (authErr || !authData.user) return json({ error: "Unauthorized" }, 401);

    const { data: adminRow } = await supabaseAdmin
      .from("admin_users")
      .select("is_active, role")
      .eq("user_id", authData.user.id)
      .maybeSingle();

    if (!adminRow?.is_active) return json({ error: "Forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "update");

    // Ensure is_visible column exists (idempotent, safe on repeated calls)
    try {
      // Only master can run schema changes; ignore errors if column already exists
      // Skipped — schema managed via migrations.
    } catch (_) { /* noop */ }

    if (action === "list") {
      const { data, error } = await supabaseAdmin
        .from("subscription_plans")
        .select("*")
        .order("price_monthly", { ascending: true });
      if (error) return json({ error: error.message }, 500);
      return json({ plans: data });
    }

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return json({ error: "id is required" }, 400);

      const allowed = [
        "name",
        "price_monthly",
        "price_yearly",
        "max_offers",
        "max_raffles",
        "max_views",
        "monthly_points_allocation",
        "checkout_url",
        "features",
        "is_visible",
      ];
      const patch: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in body) patch[key] = body[key];
      }
      if (Object.keys(patch).length === 0) {
        return json({ error: "no fields to update" }, 400);
      }
      patch.updated_at = new Date().toISOString();

      const { data, error } = await supabaseAdmin
        .from("subscription_plans")
        .update(patch)
        .eq("id", id)
        .select("*")
        .maybeSingle();

      if (error) return json({ error: error.message }, 500);
      return json({ success: true, plan: data });
    }

    return json({ error: "invalid action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
