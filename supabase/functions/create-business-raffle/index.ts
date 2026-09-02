import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const uploadRaffleImage = async (
  supabaseAdmin: ReturnType<typeof createClient>,
  businessId: string,
  userId: string,
  image: unknown,
) => {
  if (!image || typeof image !== "object") return { imageUrl: null, warning: null };

  const payload = image as Record<string, unknown>;
  const dataUrl = typeof payload.data_url === "string" ? payload.data_url : "";
  const fileName = typeof payload.file_name === "string" ? payload.file_name : "raffle-image.jpg";
  const fileType = typeof payload.file_type === "string" ? payload.file_type : "image/jpeg";

  if (!dataUrl.startsWith("data:image/")) {
    return { imageUrl: null, warning: "Imagem inválida" };
  }

  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return { imageUrl: null, warning: "Formato da imagem inválido" };
  }

  const base64 = match[2];
  const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

  if (binary.byteLength > MAX_IMAGE_BYTES) {
    return { imageUrl: null, warning: "Imagem acima de 5MB" };
  }

  const extFromName = fileName.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const extFromType = fileType.split("/").pop()?.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const ext = extFromName || extFromType || "jpg";
  const safeBusinessId = businessId.replace(/[^a-zA-Z0-9-]/g, "");
  const safeUserId = userId.replace(/[^a-zA-Z0-9-]/g, "");
  const path = `${safeBusinessId}/${safeUserId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("raffle-images")
    .upload(path, binary, {
      contentType: fileType.startsWith("image/") ? fileType : match[1],
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("[create-business-raffle] image upload error", uploadError);
    return { imageUrl: null, warning: uploadError.message || "Erro ao enviar imagem" };
  }

  const { data } = supabaseAdmin.storage.from("raffle-images").getPublicUrl(path);
  return { imageUrl: data.publicUrl, warning: null };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Método não permitido" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ success: false, error: "Configuração do servidor incompleta" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return jsonResponse({ success: false, error: "Usuário não autenticado" }, 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    console.log("[create-business-raffle] request received", {
      hasToken: Boolean(token),
      tokenPreview: token ? `${token.slice(0, 12)}...` : null,
    });

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const user = userData.user;

    console.log("[create-business-raffle] auth.getUser result", {
      userId: user?.id ?? null,
      email: user?.email ?? null,
      hasError: Boolean(userError),
      errorMessage: userError?.message ?? null,
    });

    if (userError || !user) {
      return jsonResponse({ success: false, error: "Sessão inválida. Faça login novamente." }, 401);
    }

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return jsonResponse({ success: false, error: "Dados inválidos" }, 400);
    }

    const {
      business_id,
      title,
      description,
      prize,
      entry_cost,
      end_date,
      max_participants,
      image_url,
      image,
      auto_participation,
      participation_rules,
    } = payload as Record<string, unknown>;

    console.log("[create-business-raffle] payload summary", {
      business_id,
      hasTitle: Boolean(title),
      hasPrize: Boolean(prize),
      end_date,
      entry_cost,
      max_participants,
      auto_participation,
      has_image: Boolean(image),
      has_image_url: Boolean(image_url),
    });

    if (!business_id || typeof business_id !== "string") {
      return jsonResponse({ success: false, error: "Negócio obrigatório" }, 400);
    }

    const cleanTitle = String(title ?? "").trim();
    const cleanPrize = String(prize ?? "").trim();
    const cleanDescription = String(description ?? "").trim();

    if (!cleanTitle || !cleanPrize) {
      return jsonResponse({ success: false, error: "Título e prêmio são obrigatórios" }, 400);
    }

    const endDate = new Date(String(end_date ?? ""));
    if (Number.isNaN(endDate.getTime()) || endDate <= new Date()) {
      return jsonResponse({ success: false, error: "A data de encerramento deve ser no futuro" }, 400);
    }

    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id")
      .eq("id", business_id)
      .maybeSingle();

    console.log("[create-business-raffle] business ownership check", {
      requested_business_id: business_id,
      auth_uid: user.id,
      found: Boolean(business),
      business_owner_id: business?.owner_id ?? null,
      owner_match: business?.owner_id === user.id,
      hasError: Boolean(businessError),
    });

    if (businessError) {
      console.error("[create-business-raffle] business lookup error", businessError);
      return jsonResponse({ success: false, error: "Erro ao validar o negócio" }, 500);
    }

    if (!business || business.owner_id !== user.id) {
      return jsonResponse({
        success: false,
        error: "Negócio não encontrado ou não pertence a esta conta",
        debug: {
          auth_uid: user.id,
          business_found: Boolean(business),
          business_owner_id: business?.owner_id ?? null,
        },
      }, 403);
    }

    const imageResult = await uploadRaffleImage(supabaseAdmin, business_id, user.id, image);

    const insertData = {
      business_id,
      title: cleanTitle,
      description: cleanDescription || null,
      prize: cleanPrize,
      entry_cost: Math.max(1, Number(entry_cost) || 100),
      end_date: endDate.toISOString(),
      max_participants: max_participants ? Number(max_participants) : null,
      is_active: true,
      image_url: imageResult.imageUrl || (typeof image_url === "string" && image_url.trim() ? image_url.trim() : null),
      current_participants: 0,
      auto_participation: Boolean(auto_participation),
      participation_rules: participation_rules && typeof participation_rules === "object"
        ? participation_rules
        : { checkin: false, purchase: false, follow_business: false, offer_interaction: false },
    };

    const { data: raffle, error: raffleError } = await supabaseAdmin
      .from("raffles")
      .insert(insertData)
      .select()
      .single();

    if (raffleError) {
      console.error("[create-business-raffle] insert error", raffleError);
      return jsonResponse({ success: false, error: raffleError.message || "Erro ao criar sorteio" }, 500);
    }

    return jsonResponse({ success: true, raffle, imageUploadWarning: imageResult.warning });
  } catch (error) {
    console.error("[create-business-raffle] unexpected error", error);
    return jsonResponse({ success: false, error: "Erro inesperado ao criar sorteio" }, 500);
  }
});