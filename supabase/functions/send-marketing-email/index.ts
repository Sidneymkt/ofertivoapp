import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

// ── Auth helpers ──────────────────────────────────────────────
async function authenticateAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error } = await authClient.auth.getUser();
  if (error || !user) return null;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: adminData } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("role", "master")
    .single();

  if (!adminData) return null;
  return { user, supabase };
}

// ── Batch user email fetching (parallel) ──────────────────────
async function fetchUserEmails(
  supabase: ReturnType<typeof createClient>,
  profiles: Array<{ user_id: string; full_name: string | null }>
): Promise<Array<{ user_id: string; email: string; name: string }>> {
  const BATCH_SIZE = 20;
  const results: Array<{ user_id: string; email: string; name: string }> = [];

  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (profile) => {
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
        if (authUser?.user?.email) {
          return {
            user_id: profile.user_id,
            email: authUser.user.email,
            name: profile.full_name || "Usuário",
          };
        }
      } catch {
        // skip users that fail
      }
      return null;
    });
    const batchResults = await Promise.all(promises);
    for (const r of batchResults) {
      if (r) results.push(r);
    }
  }
  return results;
}

// ── Email sending with retry + rate limit ─────────────────────
async function sendEmailWithRetry(
  fromEmail: string,
  recipient: { email: string; name: string },
  subject: string,
  html: string,
  maxRetries = 3
): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send({
        from: fromEmail,
        to: [recipient.email],
        subject,
        html,
      });
      return { success: true };
    } catch (err: any) {
      const msg = err?.message || "Unknown error";

      // Rate limit – wait and retry
      if (msg.includes("429") || msg.toLowerCase().includes("rate")) {
        const waitMs = Math.min(2000 * attempt, 10000);
        console.warn(`Rate limited on attempt ${attempt}, waiting ${waitMs}ms...`);
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }

      // Permanent error – don't retry
      if (
        msg.includes("validation_error") ||
        msg.includes("invalid") ||
        msg.includes("suppressed")
      ) {
        return { success: false, error: msg };
      }

      // Transient error – retry
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      return { success: false, error: msg };
    }
  }
  return { success: false, error: "Max retries exceeded" };
}

// ── Personalize content ───────────────────────────────────────
function personalize(template: string, name: string, email: string): string {
  return template
    .replace(/\{\{nome\}\}/gi, name)
    .replace(/\{\{email\}\}/gi, email);
}

// ── Progress updater (batch updates to avoid excessive DB writes) ──
class ProgressTracker {
  private sent = 0;
  private failed = 0;
  private total = 0;
  private campaignId: string;
  private supabase: ReturnType<typeof createClient>;
  private lastUpdate = 0;

  constructor(supabase: ReturnType<typeof createClient>, campaignId: string, total: number) {
    this.supabase = supabase;
    this.campaignId = campaignId;
    this.total = total;
  }

  async recordSent() {
    this.sent++;
    await this.maybeFlush();
  }

  async recordFailed() {
    this.failed++;
    await this.maybeFlush();
  }

  private async maybeFlush() {
    const now = Date.now();
    // Update DB at most every 3 seconds or on last item
    if (now - this.lastUpdate > 3000 || this.sent + this.failed >= this.total) {
      this.lastUpdate = now;
      await this.supabase
        .from("marketing_campaigns")
        .update({
          sent_count: this.sent,
          failed_count: this.failed,
        })
        .eq("id", this.campaignId);
    }
  }

  getStats() {
    return { sent: this.sent, failed: this.failed };
  }
}

// ── Main handler ──────────────────────────────────────────────
const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await authenticateAdmin(req);
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);

    const { supabase } = auth;
    const body = await req.json();
    const campaignId: string = body.campaign_id;
    const retryFailed: boolean = body.retry_failed === true;

    if (!campaignId) {
      return jsonResponse({ error: "campaign_id is required" }, 400);
    }

    // ── Get campaign ──
    const { data: campaign, error: campaignError } = await supabase
      .from("marketing_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return jsonResponse({ error: "Campaign not found" }, 404);
    }

    // ── Retry failed mode ──
    if (retryFailed) {
      return await handleRetryFailed(supabase, campaign, campaignId);
    }

    // ── Normal send ──
    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      return jsonResponse({ error: "Campaign already sent or in progress" }, 400);
    }

    // Mark as sending
    await supabase
      .from("marketing_campaigns")
      .update({ status: "sending", sent_at: new Date().toISOString() })
      .eq("id", campaignId);

    // ── Fetch target profiles ──
    let profileQuery = supabase.from("profiles").select("user_id, full_name");
    if (campaign.target_audience === "consumers") {
      profileQuery = profileQuery.eq("user_type", "consumer");
    } else if (campaign.target_audience === "businesses") {
      profileQuery = profileQuery.eq("user_type", "business");
    }
    const { data: profiles } = await profileQuery;

    if (!profiles || profiles.length === 0) {
      await supabase
        .from("marketing_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_recipients: 0,
          sent_count: 0,
          failed_count: 0,
        })
        .eq("id", campaignId);
      return jsonResponse({ sent: 0, failed: 0, total: 0 });
    }

    // ── Fetch emails in parallel batches ──
    const recipients = await fetchUserEmails(supabase, profiles);

    if (recipients.length === 0) {
      await supabase
        .from("marketing_campaigns")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          total_recipients: 0,
          sent_count: 0,
          failed_count: 0,
        })
        .eq("id", campaignId);
      return jsonResponse({ sent: 0, failed: 0, total: 0 });
    }

    // Update total recipients
    await supabase
      .from("marketing_campaigns")
      .update({ total_recipients: recipients.length })
      .eq("id", campaignId);

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Ofertivo <onboarding@resend.dev>";
    const tracker = new ProgressTracker(supabase, campaignId, recipients.length);

    // ── Send in controlled batches ──
    const SEND_BATCH = 5; // concurrent sends per batch
    const BATCH_DELAY_MS = 500; // pause between batches to respect rate limits

    for (let i = 0; i < recipients.length; i += SEND_BATCH) {
      const batch = recipients.slice(i, i + SEND_BATCH);

      const promises = batch.map(async (recipient) => {
        const personalizedHtml = personalize(
          campaign.message_html || campaign.message,
          recipient.name,
          recipient.email
        );
        const personalizedSubject = personalize(
          campaign.subject || campaign.title,
          recipient.name,
          recipient.email
        );

        const result = await sendEmailWithRetry(
          fromEmail,
          recipient,
          personalizedSubject,
          personalizedHtml
        );

        // Record recipient result
        await supabase.from("marketing_campaign_recipients").insert({
          campaign_id: campaignId,
          user_id: recipient.user_id,
          email: recipient.email,
          channel: "email",
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.error || null,
        });

        if (result.success) {
          await tracker.recordSent();
        } else {
          await tracker.recordFailed();
        }
      });

      await Promise.all(promises);

      // Small delay between batches to avoid rate limits
      if (i + SEND_BATCH < recipients.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    const stats = tracker.getStats();

    // ── Finalize campaign ──
    await supabase
      .from("marketing_campaigns")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        sent_count: stats.sent,
        failed_count: stats.failed,
      })
      .eq("id", campaignId);

    return jsonResponse({
      sent: stats.sent,
      failed: stats.failed,
      total: recipients.length,
    });
  } catch (error: any) {
    console.error("Error in send-marketing-email:", error);
    return jsonResponse({ error: error.message }, 500);
  }
};

// ── Retry failed emails for a campaign ────────────────────────
async function handleRetryFailed(
  supabase: ReturnType<typeof createClient>,
  campaign: any,
  campaignId: string
): Promise<Response> {
  // Get failed recipients
  const { data: failedRecipients } = await supabase
    .from("marketing_campaign_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .eq("status", "failed");

  if (!failedRecipients || failedRecipients.length === 0) {
    return jsonResponse({ sent: 0, failed: 0, total: 0, message: "No failed emails to retry" });
  }

  // Update campaign status
  await supabase
    .from("marketing_campaigns")
    .update({ status: "sending" })
    .eq("id", campaignId);

  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Ofertivo <onboarding@resend.dev>";
  let retrySent = 0;
  let retryFailed = 0;

  const SEND_BATCH = 5;
  const BATCH_DELAY_MS = 500;

  for (let i = 0; i < failedRecipients.length; i += SEND_BATCH) {
    const batch = failedRecipients.slice(i, i + SEND_BATCH);

    const promises = batch.map(async (recipient) => {
      const name = recipient.email.split("@")[0]; // fallback name
      const personalizedHtml = personalize(
        campaign.message_html || campaign.message,
        name,
        recipient.email!
      );
      const personalizedSubject = personalize(
        campaign.subject || campaign.title,
        name,
        recipient.email!
      );

      const result = await sendEmailWithRetry(
        fromEmail,
        { email: recipient.email!, name },
        personalizedSubject,
        personalizedHtml
      );

      // Update the existing recipient record
      await supabase
        .from("marketing_campaign_recipients")
        .update({
          status: result.success ? "sent" : "failed",
          sent_at: result.success ? new Date().toISOString() : null,
          error_message: result.success ? null : (result.error || null),
        })
        .eq("id", recipient.id);

      if (result.success) retrySent++;
      else retryFailed++;
    });

    await Promise.all(promises);
    if (i + SEND_BATCH < failedRecipients.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Update campaign stats
  const prevSent = campaign.sent_count || 0;
  const prevFailed = campaign.failed_count || 0;
  await supabase
    .from("marketing_campaigns")
    .update({
      status: "completed",
      sent_count: prevSent + retrySent,
      failed_count: prevFailed - retrySent, // reduce failed count by successful retries
      completed_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return jsonResponse({
    sent: retrySent,
    failed: retryFailed,
    total: failedRecipients.length,
    message: "Retry completed",
  });
}

serve(handler);
