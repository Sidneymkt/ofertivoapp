import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: require authenticated caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { businessName, productOrService, category, originalPrice, interests } = await req.json();

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    if (!businessName || !productOrService) {
      throw new Error("Campos obrigatórios não fornecidos");
    }

    console.log("Gerando oferta com IA para:", { businessName, productOrService, category });

    const prompt = `Você é um especialista em marketing e copywriting para negócios locais no Brasil.

DADOS DO NEGÓCIO:
- Nome: ${businessName}
- Produto/Serviço: ${productOrService}
${category ? `- Categoria: ${category}` : ''}
${originalPrice ? `- Preço Original: R$ ${originalPrice}` : ''}
${interests ? `- Público-alvo: ${interests}` : ''}

TAREFA:
Crie uma oferta promocional atrativa e persuasiva seguindo a estrutura AIDA (Atenção, Interesse, Desejo, Ação).

INSTRUÇÕES:
1. Título: Crie um título chamativo e urgente (máx 80 caracteres)
2. Descrição: Use a metodologia AIDA em 3-4 parágrafos curtos:
   - ATENÇÃO: Gancho inicial impactante
   - INTERESSE + DESEJO: Benefícios e transformação
   - AÇÃO: Call-to-action claro e urgente
3. Sugestão de Desconto: Entre 20% e 50% (baseado no tipo de produto)
4. Tipo de Promoção: Escolha entre "relampago", "exclusiva", "combo" ou "primeiro_uso"

FORMATO DA RESPOSTA (JSON):
{
  "title": "Título da oferta",
  "description": "Descrição completa usando AIDA",
  "suggestedDiscount": 30,
  "offerType": "relampago",
  "tips": "Dica específica para maximizar essa oferta"
}

IMPORTANTE:
- Use linguagem brasileira e informal
- Crie senso de urgência e escassez
- Foque nos benefícios, não nas características
- Seja específico e tangível
- Use emojis estratégicos (1-2 apenas)`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { 
            role: "system", 
            content: "Você é um especialista em marketing digital e copywriting para negócios locais. Sempre responda em JSON válido." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API Lovable AI:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Limite de uso da IA atingido. Tente novamente em alguns minutos.");
      }
      if (response.status === 402) {
        throw new Error("Créditos de IA esgotados. Adicione créditos no painel Lovable.");
      }
      
      throw new Error("Erro ao gerar conteúdo com IA");
    }

    const data = await response.json();
    const aiContent = data.choices?.[0]?.message?.content;

    if (!aiContent) {
      throw new Error("Resposta vazia da IA");
    }

    console.log("Resposta da IA:", aiContent);

    // Extrair JSON da resposta (pode vir com markdown)
    let offerData;
    try {
      // Tentar extrair JSON se vier com markdown
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        offerData = JSON.parse(jsonMatch[0]);
      } else {
        offerData = JSON.parse(aiContent);
      }
    } catch (parseError) {
      console.error("Erro ao fazer parse do JSON:", parseError);
      console.error("Conteúdo recebido:", aiContent);
      throw new Error("Formato de resposta inválido da IA");
    }

    // Calcular preço com desconto se fornecido preço original
    let discountedPrice = null;
    if (originalPrice && offerData.suggestedDiscount) {
      const discount = offerData.suggestedDiscount / 100;
      discountedPrice = Math.round(originalPrice * (1 - discount) * 100) / 100;
    }

    const result = {
      title: offerData.title || "",
      description: offerData.description || "",
      suggestedDiscount: offerData.suggestedDiscount || 30,
      discountedPrice: discountedPrice,
      originalPrice: originalPrice,
      offerType: offerData.offerType || "standard",
      tips: offerData.tips || ""
    };

    console.log("Oferta gerada com sucesso:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro no edge function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao processar solicitação",
        details: error.toString()
      }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
