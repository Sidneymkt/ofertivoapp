import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // SECURITY: require authenticated caller to prevent paid-API abuse
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get Gemini API key from Supabase secrets
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { prompt, type = 'title' } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    let systemPrompt = '';
    
    switch (type) {
      case 'title':
        systemPrompt = 'Você é um especialista em copywriting comercial. Crie títulos profissionais, atrativos e otimizados para ofertas comerciais. Máximo 60 caracteres. Use linguagem profissional, objetiva e sem regionalismos.';
        break;
      case 'description':
        systemPrompt = 'Você é um redator comercial especialista. Crie descrições persuasivas entre 200-350 caracteres para ofertas comerciais usando gatilhos mentais, urgência e call-to-action. Linguagem profissional e objetiva, sem regionalismos.';
        break;
      case 'aida':
        systemPrompt = 'Você é um especialista em copywriting com foco na metodologia AIDA. Crie descrições comerciais entre 280-400 caracteres seguindo rigorosamente a estrutura Atenção-Interesse-Desejo-Ação. Linguagem profissional e persuasiva, sem regionalismos.';
        break;
      case 'marketing':
        systemPrompt = 'Você é um especialista em marketing digital. Crie copy persuasivo e profissional para diferentes plataformas de marketing (social media, WhatsApp, email) com foco em conversão. Linguagem profissional sem regionalismos.';
        break;
      case 'full_email':
        systemPrompt = 'Você é um especialista em e-mail marketing. Gere campanhas completas com assunto, mensagem de texto e HTML responsivo profissional. Retorne SEMPRE um JSON válido com as chaves: subject, message, html. Linguagem profissional sem regionalismos.';
        break;
      default:
        systemPrompt = 'Você é um assistente especializado em marketing e comunicação comercial profissional.';
    }

    const maxTokens = (type === 'html' || type === 'full_email') ? 8192 : 1024;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${systemPrompt}\n\n${prompt}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: maxTokens,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('Gemini API response:', JSON.stringify(data, null, 2));
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }
    
    const content = data.candidates[0].content;
    if (!content.parts || !content.parts[0] || !content.parts[0].text) {
      console.error('Missing parts in response:', content);
      throw new Error('Invalid content structure from Gemini API');
    }
    
    const generatedText = content.parts[0].text;

    return new Response(JSON.stringify({ 
      success: true,
      generatedText: generatedText.trim()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in gemini-ai function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});