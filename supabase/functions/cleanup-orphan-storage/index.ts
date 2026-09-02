// Cleanup orphan files across storage buckets.
// Admin-only. Defaults to dry_run = true. Pass { dry_run: false } to delete.
//
// Buckets cleaned and their reference sources:
//   - offer-images        -> offers.image_url, offers.image_urls
//   - avatars             -> profiles.avatar_url
//   - business-logos      -> businesses.logo_url
//   - business-covers     -> businesses.cover_image_url
//   - user-covers         -> profiles.cover_image_url
//   - community-posts     -> community_posts.images / image_urls / media_urls
//   - offer-ai-assets     -> (no DB column; all considered orphan when unreferenced from offers.image_urls)
//   - campaign-images     -> crowdfunding_campaigns.image_url / images
//   - raffle-images       -> raffles.image_url / images
//   - marketing-media     -> (admin uploads; keep all)

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Body = { dry_run?: boolean; buckets?: string[] };

const TARGETS: { bucket: string; sources?: { table: string; cols: string[] }[]; deleteAllOrphans?: boolean }[] = [
  { bucket: "offer-images", sources: [{ table: "offers", cols: ["image_url", "image_urls"] }] },
  { bucket: "avatars", sources: [{ table: "profiles", cols: ["avatar_url"] }] },
  { bucket: "business-logos", sources: [{ table: "businesses", cols: ["logo_url"] }] },
  { bucket: "business-covers", sources: [{ table: "businesses", cols: ["cover_image_url"] }] },
  { bucket: "user-covers", sources: [{ table: "profiles", cols: ["cover_image_url"] }] },
  { bucket: "community-posts", sources: [{ table: "community_posts", cols: ["image_url", "image_urls", "images", "media_urls"] }] },
  { bucket: "offer-ai-assets", deleteAllOrphans: true, sources: [{ table: "offers", cols: ["image_url", "image_urls"] }] },
];

async function listAllFiles(admin: ReturnType<typeof createClient>, bucket: string) {
  // recursively list files (depth 2 is enough for our layout: {userId}/{file})
  const all: string[] = [];
  const queue: string[] = [""];
  while (queue.length) {
    const prefix = queue.shift()!;
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    if (error) throw new Error(`list ${bucket}/${prefix}: ${error.message}`);
    for (const item of data ?? []) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        // folder
        queue.push(path);
      } else {
        all.push(path);
      }
    }
  }
  return all;
}

async function collectReferences(admin: ReturnType<typeof createClient>, sources: { table: string; cols: string[] }[]) {
  const refs = new Set<string>();
  for (const src of sources) {
    const { data, error } = await admin.from(src.table).select(src.cols.join(","));
    if (error) {
      console.warn(`select ${src.table}:`, error.message);
      continue;
    }
    for (const row of (data as any[]) ?? []) {
      for (const c of src.cols) {
        const v = row?.[c];
        if (!v) continue;
        if (typeof v === "string") refs.add(v);
        else if (Array.isArray(v)) v.forEach((u) => typeof u === "string" && refs.add(u));
      }
    }
  }
  return refs;
}

function isReferenced(filePath: string, refs: Set<string>) {
  // match by filename suffix; URLs may have query strings or be relative
  const bare = filePath.split("/").pop()!;
  for (const url of refs) {
    if (url.includes(filePath) || url.includes(bare)) return true;
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization header required" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await admin.auth.getUser(token);
    if (authErr || !authData.user) return json({ error: "Not authenticated" }, 401);

    const { data: adminRow } = await admin
      .from("admin_users")
      .select("is_active")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (!adminRow?.is_active) return json({ error: "Forbidden" }, 403);

    const body = (await req.json().catch(() => ({}))) as Body;
    const dryRun = body.dry_run !== false; // default true
    const filterBuckets = body.buckets;

    const report: Record<string, { total: number; orphans: number; deleted: number; sample: string[] }> = {};
    for (const target of TARGETS) {
      if (filterBuckets && !filterBuckets.includes(target.bucket)) continue;
      const files = await listAllFiles(admin, target.bucket);
      const refs = target.sources ? await collectReferences(admin, target.sources) : new Set<string>();
      const orphans = files.filter((f) => !isReferenced(f, refs));

      let deleted = 0;
      if (!dryRun && orphans.length) {
        // delete in batches of 100
        for (let i = 0; i < orphans.length; i += 100) {
          const batch = orphans.slice(i, i + 100);
          const { error } = await admin.storage.from(target.bucket).remove(batch);
          if (error) {
            console.error(`remove ${target.bucket}:`, error.message);
          } else {
            deleted += batch.length;
          }
        }
      }
      report[target.bucket] = {
        total: files.length,
        orphans: orphans.length,
        deleted,
        sample: orphans.slice(0, 5),
      };
    }

    return json({ dry_run: dryRun, report });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
