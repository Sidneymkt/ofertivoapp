import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // SECURITY: only admins or callers presenting the internal cron secret may trigger.
    const cronSecret = Deno.env.get("EMAIL_FUNNEL_CRON_SECRET");
    const providedSecret = req.headers.get("x-cron-secret");
    const isCron = !!(cronSecret && providedSecret && providedSecret === cronSecret);

    if (!isCron) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!adminRow) {
        return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
          status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const resend = new Resend(resendKey);
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Ofertivo <onboarding@resend.dev>";

    // Get all active funnel templates
    const { data: templates, error: tplErr } = await supabase
      .from("email_funnel_templates")
      .select("*")
      .eq("is_active", true)
      .order("funnel_type")
      .order("step_order");

    if (tplErr || !templates || templates.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No active templates" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, user_type, created_at");

    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No users found" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get all already-sent records to avoid duplicates
    const { data: sentRecords } = await supabase
      .from("email_funnel_sent")
      .select("user_id, template_id");

    const sentSet = new Set(
      (sentRecords || []).map((r: any) => `${r.user_id}:${r.template_id}`)
    );

    const now = new Date();
    let totalSent = 0;
    let totalFailed = 0;

    for (const profile of profiles) {
      // Map user_type to funnel_type
      const funnelType = profile.user_type === "business" ? "business" : "consumer";
      const userTemplates = templates.filter((t: any) => t.funnel_type === funnelType);

      const registrationDate = new Date(profile.created_at);

      for (const template of userTemplates) {
        const key = `${profile.user_id}:${template.id}`;
        if (sentSet.has(key)) continue; // Already sent

        // Check if enough days have passed
        const daysSinceRegistration = Math.floor(
          (now.getTime() - registrationDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceRegistration < template.delay_days) continue; // Not yet time

        // Get user email from auth
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
        if (!authUser?.user?.email) continue;

        const userName = profile.full_name || "Usuário";
        const userEmail = authUser.user.email;

        try {
          const htmlContent = (template.message_html || template.message)
            .replace(/\{\{nome\}\}/gi, userName)
            .replace(/\{\{email\}\}/gi, userEmail);

          const subject = template.subject
            .replace(/\{\{nome\}\}/gi, userName);

          const ctaButton = `<div style="text-align:center;margin:24px 0;"><a href="https://ofertivoapp.com" target="_blank" style="display:inline-block;background-color:#FF6B00;color:#ffffff;font-weight:bold;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">Acesse o Ofertivo</a></div>`;

          const finalHtml = template.message_html
            ? (htmlContent.includes('ofertivoapp.com') ? htmlContent : htmlContent.replace(/<\/body>/i, `${ctaButton}</body>`).replace(/^(?!.*<\/body>)(.*)$/s, (match) => match.includes('</body>') ? match : `${match}${ctaButton}`))
            : `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">${htmlContent.replace(/\n/g, "<br/>")}${ctaButton}</div>`;

          await resend.emails.send({
            from: fromEmail,
            to: [userEmail],
            subject,
            html: finalHtml,
          });

          await supabase.from("email_funnel_sent").insert({
            user_id: profile.user_id,
            template_id: template.id,
            status: "sent",
          });

          totalSent++;
        } catch (err: any) {
          console.error(`Failed funnel email to ${userEmail}:`, err.message);

          await supabase.from("email_funnel_sent").insert({
            user_id: profile.user_id,
            template_id: template.id,
            status: "failed",
            error_message: err.message,
          });

          totalFailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({ sent: totalSent, failed: totalFailed }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error processing email funnel:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
