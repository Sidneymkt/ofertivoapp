// Gera a PERSONA (pessoa real) usada nas artes de ofertas/sorteios.
// Nunca gera mascotes, desenhos ou ícones.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Recurso controlado pelo administrador (evita consumo indevido de créditos de IA).
    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );
    const { data: setting } = await admin
      .from('platform_settings')
      .select('setting_value')
      .eq('setting_key', 'ai_persona_generation')
      .eq('is_active', true)
      .maybeSingle();
    if (!setting || (setting.setting_value as any)?.enabled !== true) {
      return new Response(JSON.stringify({ error: 'persona_ai_disabled' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, transparent = true } = await req.json();
    if (!prompt || typeof prompt !== 'string' || prompt.length > 3000) {
      return new Response(JSON.stringify({ error: 'invalid prompt' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    const key = Deno.env.get('LOVABLE_API_KEY');
    if (!key) {
      return new Response(JSON.stringify({ error: 'missing LOVABLE_API_KEY' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fullPrompt =
      `${prompt}. PESSOA REAL fotografada (jamais mascote, desenho, cartoon, 3D estilizado ou emoji), ` +
      `pessoa isolada e centralizada, proporções naturais, mãos corretas, ` +
      (transparent
        ? `fundo TOTALMENTE BRANCO liso (#FFFFFF), sem cenário e sem sombra no fundo, `
        : ``) +
      `sem nenhum texto, logotipo ou marca d'água na imagem, alta qualidade, iluminação suave e uniforme.`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image',
        messages: [{ role: 'user', content: fullPrompt }],
        modalities: ['image', 'text'],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      console.error('[generate-persona-image] gateway error', res.status, t);
      return new Response(JSON.stringify({ error: 'gateway_error', status: res.status, detail: t }), {
        status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return new Response(JSON.stringify({ error: 'no_image' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ b64_json: b64 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
