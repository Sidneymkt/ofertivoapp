import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const { prompt, action } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    let systemPrompt = '';
    let tools: any[] = [];

    switch (action) {
      case 'improve_offer':
        systemPrompt = 'Você é um especialista em marketing digital com foco em e-commerce e ofertas locais em Manaus. Analise ofertas e sugira melhorias baseadas em copywriting, SEO local e gatilhos mentais.';
        tools = [{
          type: "function",
          function: {
            name: "suggest_improvements",
            description: "Retorna sugestões de melhoria para uma oferta",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "Título otimizado (max 60 chars)" },
                description: { type: "string", description: "Descrição AIDA (max 180 chars)" },
                cta: { type: "string", description: "Call-to-action impactante (max 30 chars)" },
                hashtags: { 
                  type: "array",
                  items: { type: "string" },
                  description: "5 hashtags relevantes"
                },
                bestTime: { type: "string", description: "Melhor horário para publicar (HH:MM)" },
                imageDescription: { type: "string", description: "Descrição do tipo de imagem ideal" }
              },
              required: ["title", "description", "cta", "hashtags", "bestTime", "imageDescription"],
              additionalProperties: false
            }
          }
        }];
        break;

      case 'create_campaign':
        systemPrompt = 'Você é um estrategista de marketing especializado em criar campanhas promocionais completas. Baseie-se em dados do mercado de Manaus e tendências de consumo local.';
        tools = [{
          type: "function",
          function: {
            name: "create_campaign",
            description: "Cria uma campanha de marketing completa",
            parameters: {
              type: "object",
              properties: {
                offerType: { 
                  type: "string",
                  enum: ["Flash Sale", "Exclusiva App", "Combo", "Primeiro Uso"],
                  description: "Tipo ideal de oferta"
                },
                title: { type: "string", description: "Título atrativo (max 60 chars)" },
                description: { type: "string", description: "Descrição AIDA (max 180 chars)" },
                cta: { type: "string", description: "Call-to-action" },
                imageDescription: { type: "string", description: "Descrição da imagem ideal" },
                suggestedPrice: {
                  type: "object",
                  properties: {
                    original: { type: "number", description: "Preço original sugerido" },
                    discounted: { type: "number", description: "Preço com desconto sugerido" }
                  },
                  required: ["original", "discounted"]
                }
              },
              required: ["offerType", "title", "description", "cta", "imageDescription", "suggestedPrice"],
              additionalProperties: false
            }
          }
        }];
        break;

      case 'generate_social':
        systemPrompt = 'Você é um especialista em social media marketing com foco em redes sociais brasileiras. Crie conteúdo otimizado para Instagram, Facebook e WhatsApp com linguagem regional de Manaus.';
        tools = [{
          type: "function",
          function: {
            name: "generate_social_content",
            description: "Gera conteúdo para redes sociais",
            parameters: {
              type: "object",
              properties: {
                short: { type: "string", description: "Texto curto para Stories/WhatsApp (max 140 chars)" },
                emoji: { type: "string", description: "Texto com emojis para feed (max 200 chars)" },
                formal: { type: "string", description: "Texto formal para anúncios (max 180 chars)" },
                hashtags: {
                  type: "array",
                  items: { type: "string" },
                  description: "5 hashtags relevantes"
                },
                bestTime: { type: "string", description: "Melhor horário para postar (HH:MM)" },
                audienceTip: { type: "string", description: "Dica de público-alvo (max 100 chars)" }
              },
              required: ["short", "emoji", "formal", "hashtags", "bestTime", "audienceTip"],
              additionalProperties: false
            }
          }
        }];
        break;

      default:
        throw new Error('Invalid action');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        tools,
        tool_choice: { type: "function", function: { name: tools[0].function.name } }
      })
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requisições excedido. Tente novamente em alguns momentos.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Créditos insuficientes. Adicione créditos na sua workspace Lovable.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI Response:', JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in response');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Return based on action
    switch (action) {
      case 'improve_offer':
        return new Response(JSON.stringify({ suggestions: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      case 'create_campaign':
        return new Response(JSON.stringify({ campaign: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      case 'generate_social':
        return new Response(JSON.stringify({ content: result }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      default:
        throw new Error('Invalid action');
    }

  } catch (error) {
    console.error('Error in marketing-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
