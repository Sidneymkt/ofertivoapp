import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require authenticated caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authedClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const callerId = userData.user.id;

    const { raffle_id, winner_id } = await req.json();
    if (!raffle_id || !winner_id) {
      return json({ error: "raffle_id and winner_id are required" }, 400);
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch raffle + business
    const { data: raffle, error: raffleErr } = await supabase
      .from("raffles")
      .select("title, prize, business_id")
      .eq("id", raffle_id)
      .maybeSingle();
    if (raffleErr || !raffle) return json({ error: "Raffle not found" }, 404);

    // Authorize: caller must own the business or be admin
    let authorized = false;
    if (raffle.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("owner_id")
        .eq("id", raffle.business_id)
        .maybeSingle();
      if (biz?.owner_id === callerId) authorized = true;
    }
    if (!authorized) {
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", callerId)
        .maybeSingle();
      if (adminRow) authorized = true;
    }
    if (!authorized) return json({ error: "Forbidden" }, 403);

    let businessName = "Ofertivo";
    if (raffle.business_id) {
      const { data: biz } = await supabase
        .from("businesses")
        .select("business_name")
        .eq("id", raffle.business_id)
        .maybeSingle();
      if (biz?.business_name) businessName = biz.business_name;
    }

    // Fetch winner email + name
    const { data: authUser } = await supabase.auth.admin.getUserById(winner_id);
    const email = authUser?.user?.email;
    if (!email) return json({ error: "Winner email not found" }, 404);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", winner_id)
      .maybeSingle();
    const name = profile?.full_name || "Ganhador";

    const resend = new Resend(apiKey);
    const subject = `🎉 Você ganhou o sorteio "${raffle.title}"!`;
    const html = `
      <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; color: #0D1520;">
        <div style="background: linear-gradient(135deg, #0D1520 0%, #1a2942 100%); padding: 32px 24px; text-align: center;">
          <h1 style="color: #FFD700; margin: 0; font-size: 26px;">🎉 Parabéns, ${name}!</h1>
          <p style="color: #ffffff; margin: 8px 0 0; font-size: 15px;">Você foi o ganhador do sorteio</p>
        </div>
        <div style="padding: 24px;">
          <h2 style="margin: 0 0 8px; font-size: 20px;">${raffle.title}</h2>
          ${raffle.prize ? `<p style="margin: 0 0 16px; color: #374151;"><strong>Prêmio:</strong> ${raffle.prize}</p>` : ""}
          <p style="margin: 0 0 16px; color: #374151; line-height: 1.5;">
            O sorteio foi realizado de forma transparente e auditável pelo <strong>${businessName}</strong>.
            Entre em contato com o organizador para combinar a retirada do seu prêmio.
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              💡 Guarde este e-mail como comprovante. Acesse o Ofertivo para ver detalhes do sorteio.
            </p>
          </div>
          <a href="https://ofertivoapp.com/notificacoes" style="display: inline-block; background: #FFD700; color: #0D1520; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Ver no app</a>
        </div>
        <div style="padding: 16px 24px; background: #f9fafb; text-align: center; font-size: 12px; color: #9ca3af;">
          Ofertivo — conectando você aos melhores negócios locais.
        </div>
      </div>
    `;

    const { error: sendErr } = await resend.emails.send({
      from: "Ofertivo <sorteios@ofertivoapp.com>",
      to: [email],
      subject,
      html,
    });

    if (sendErr) {
      console.error("[send-raffle-winner-email] Resend error:", sendErr);
      return json({ error: "Failed to send email", details: sendErr }, 500);
    }

    return json({ success: true });
  } catch (err) {
    console.error("[send-raffle-winner-email] Error:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
