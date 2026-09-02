// Edge Function leve: melhora um único campo de texto (título/CTA/subtítulo) usando Lovable AI Gateway.
// Substitui o uso de imagem-IA cara — apenas reescrita de texto curto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FREE_LIMIT = 3;

interface Body {
  businessId: string;
  field: 'title' | 'cta' | 'subtitle' | 'trigger';
  currentText: string;
  context?: { offerTitle?: string; price?: number; category?: string };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY não configurada' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.businessId || !body?.field || !body?.currentText) {
      return new Response(JSON.stringify({ error: 'Parâmetros faltando' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica ownership
    const { data: biz } = await admin
      .from('businesses').select('id, owner_id').eq('id', body.businessId).maybeSingle();
    if (!biz || biz.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica limite (free=3/mês, pago=ilimitado)
    const { data: sub } = await admin
      .from('business_subscriptions')
      .select('subscription_plans(name)')
      .eq('business_id', biz.id)
      .in('status', ['active', 'trialing', 'paid', 'approved'])
      .maybeSingle();

    const isPaid = !!sub;

    if (!isPaid) {
      const { data: usage } = await admin.rpc('get_ai_text_improvement_usage_this_month', {
        p_business_id: biz.id,
      });
      const used = usage ?? 0;
      if (used >= FREE_LIMIT) {
        return new Response(JSON.stringify({
          error: `Limite mensal atingido (${FREE_LIMIT} usos/mês no plano Gratuito). Faça upgrade para uso ilimitado.`,
          code: 'LIMIT_REACHED',
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Monta prompt curto
    const fieldInstruction: Record<string, string> = {
      title: 'um TÍTULO de oferta mais persuasivo (máx 50 caracteres, em CAIXA ALTA, sem emojis)',
      cta: 'um CTA (call-to-action) curto e enérgico para botão (máx 20 caracteres, CAIXA ALTA)',
      subtitle: 'um subtítulo descritivo persuasivo (máx 80 caracteres)',
      trigger: 'um gatilho mental curto de urgência/escassez (máx 30 caracteres, CAIXA ALTA)',
    };

    const ctxBits: string[] = [];
    if (body.context?.offerTitle) ctxBits.push(`Oferta: ${body.context.offerTitle}`);
    if (body.context?.price) ctxBits.push(`Preço: R$ ${body.context.price.toFixed(2)}`);
    if (body.context?.category) ctxBits.push(`Categoria: ${body.context.category}`);

    const prompt = `Reescreva ${fieldInstruction[body.field] || 'o texto'} para uma oferta no Brasil.
${ctxBits.length ? 'Contexto: ' + ctxBits.join(' | ') : ''}
Texto atual: "${body.currentText}"

Regras:
- Português brasileiro natural
- Sem aspas, sem explicação, retorne SOMENTE o novo texto
- Foco em conversão para varejo local
- Não invente preços nem prazos`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: 'Você é um copywriter brasileiro especialista em varejo local. Responda APENAS com o texto final, sem aspas nem explicação.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 80,
        temperature: 0.85,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => '');
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Aguarde alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: `Falha IA (${aiRes.status}): ${errText.slice(0, 200)}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    let text: string = data?.choices?.[0]?.message?.content?.trim() || '';
    text = text.replace(/^["'`]+|["'`]+$/g, '').trim();

    // Registra uso
    await admin.from('ai_text_improvement_usage').insert({
      business_id: biz.id,
      user_id: user.id,
      field: body.field,
    });

    return new Response(JSON.stringify({ text, isPaid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
