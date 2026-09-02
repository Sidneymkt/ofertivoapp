// Edge Function: generate-offer-art-openai
// Gera a arte COMPLETA da oferta 100% pela IA (Gemini Nano Banana 2 via Lovable AI Gateway),
// usando a imagem principal da oferta como referência. Retorna base64 PNG.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const MODEL = 'google/gemini-3.1-flash-image';

function money(n: number) {
  try { return `R$ ${Number(n).toFixed(2).replace('.', ',')}`; } catch { return `R$ ${n}`; }
}

async function urlToDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const ct = r.headers.get('content-type') || 'image/png';
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
    }
    const b64 = btoa(bin);
    const mime = ct.startsWith('image/') ? ct : 'image/png';
    return `data:${mime};base64,${b64}`;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY ausente' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      title, description, price, originalPrice, category,
      businessName, cta = 'APROVEITE AGORA', validUntil,
      format = 'post', characterPrompt = '', styleHint = '', imageUrl,
    } = body || {};

    if (!title || typeof price !== 'number') {
      return new Response(JSON.stringify({ error: 'Parâmetros inválidos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aspect =
      format === 'story' ? '9:16 (1024x1536, vertical story)'
      : format === 'a4' || format === 'a3' ? '2:3 (retrato cartaz)'
      : '1:1 (1024x1024, post quadrado)';

    const discount = originalPrice && originalPrice > price
      ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    const validText = validUntil
      ? (() => { try { return new Date(validUntil).toLocaleDateString('pt-BR'); } catch { return ''; } })()
      : '';

    const characterBlock = characterPrompt && characterPrompt.trim()
      ? `\nInclua um mascote/personagem coerente: ${characterPrompt.trim()}. Ele deve interagir com o produto sem cobrir textos.`
      : '';

    const prompt = `Crie um ANÚNCIO PUBLICITÁRIO COMPLETO e PROFISSIONAL, pronto para postar em redes sociais, no formato ${aspect}.
Categoria: ${category || 'geral'}.
Nome do negócio (discreto no topo ou rodapé): ${businessName || ''}.

TEXTOS RENDERIZADOS NA IMAGEM (PORTUGUÊS BRASILEIRO exato, tipografia moderna, hierarquia clara, alto contraste, SEM erros ortográficos):
• Título principal grande e chamativo: "${title}"
${description ? `• Subtítulo curto: "${String(description).slice(0, 90)}"` : ''}
• Preço promocional em destaque: "${money(price)}"
${originalPrice && originalPrice > price ? `• Preço original riscado menor: "${money(originalPrice)}"` : ''}
${discount > 0 ? `• Selo circular de desconto: "-${discount}% OFF"` : ''}
• Botão/CTA grande: "${cta}"
${validText ? `• Aviso pequeno: "Válido até ${validText}"` : ''}

REGRAS OBRIGATÓRIAS:
1. Use a IMAGEM DE REFERÊNCIA como o PRODUTO PRINCIPAL da arte (fidelidade máxima, sem deformar, iluminação estúdio, sombras suaves).
2. Fundo moderno coerente com a categoria (degradê rico, formas geométricas contemporâneas), sem poluição.
3. Todos os textos LEGÍVEIS, sem sobreposição entre si e sem cortes. Margens de segurança ~6%.
4. NADA de QR code, watermarks, letras aleatórias, símbolos estranhos ou textos inventados fora da lista acima.
5. IMPORTANTE: DEIXE o CANTO INFERIOR DIREITO totalmente LIVRE (área quadrada ocupando ~28% do lado menor da imagem) — sem texto, sem elementos, sem produto nessa região. Um QR Code oficial será inserido nessa área depois.
6. Paleta coerente com "${category || 'promoção'}".${characterBlock}
${styleHint ? `\nESTILO DESTA VARIAÇÃO: ${styleHint}` : ''}
Entregue uma peça publicitária final, polida, nível agência.`;

    const userContent: any[] = [{ type: 'text', text: prompt }];
    let usedReference = false;
    if (imageUrl && typeof imageUrl === 'string') {
      const dataUrl = await urlToDataUrl(imageUrl);
      if (dataUrl) {
        userContent.push({ type: 'image_url', image_url: { url: dataUrl } });
        usedReference = true;
      }
    }

    const aiRes = await fetch(`${GATEWAY}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: userContent }],
        modalities: ['image', 'text'],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      let msg = errText;
      try { msg = JSON.parse(errText)?.error?.message || errText; } catch {}
      console.error('[generate-offer-art-openai] AI error', aiRes.status, msg);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições. Tente novamente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Peça ao administrador para adicionar créditos.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: msg || 'Falha na IA' }), {
        status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiJson = await aiRes.json();
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) {
      console.error('[generate-offer-art-openai] resposta sem b64', JSON.stringify(aiJson).slice(0, 500));
      return new Response(JSON.stringify({ error: 'Resposta inválida da IA' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ b64, usedReference }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[generate-offer-art-openai]', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
