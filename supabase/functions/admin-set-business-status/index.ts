import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  businessId?: string;
  isActive?: boolean;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization header required" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "User not authenticated" }, 401);

    const userId = authData.user.id;

    // Validate admin
    const { data: adminRow, error: adminErr } = await supabaseAdmin
      .from("admin_users")
      .select("is_active, role")
      .eq("user_id", userId)
      .maybeSingle();

    if (adminErr) return json({ error: "Failed to verify admin" }, 500);
    if (!adminRow?.is_active) return json({ error: "Forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const businessId = body.businessId;
    const isActive = body.isActive;

    if (!businessId || typeof businessId !== "string") {
      return json({ error: "businessId is required" }, 400);
    }
    if (typeof isActive !== "boolean") {
      return json({ error: "isActive must be boolean" }, 400);
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("businesses")
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq("id", businessId)
      .select("id, is_active")
      .maybeSingle();

    if (updateErr) return json({ error: updateErr.message }, 500);
    if (!updated) return json({ error: "Business not found" }, 404);

    return json({ success: true, business: updated });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 500);
  }
});
