import { supabase } from '@/integrations/supabase/client'

interface OfferInput {
  businessName: string
  category: string
  originalPrice: number
  discountedPrice: number
  productOrService: string
  targetAudience?: string
}

export class GeminiService {
  private async callGeminiFunction(prompt: string, type: string): Promise<string> {
    const { data, error } = await supabase.functions.invoke('gemini-ai', {
      body: { prompt, type }
    })

    if (error) {
      console.error('Erro ao chamar função Gemini:', error)
      throw new Error(`Erro na API: ${error.message}`)
    }

    if (!data.success) {
      throw new Error(data.error || 'Erro desconhecido na API')
    }

    return data.generatedText
  }

  async generateOfferTitle(input: OfferInput): Promise<string> {
    const discountPercentage = Math.round(((input.originalPrice - input.discountedPrice) / input.originalPrice) * 100)
    
    const prompt = `
    Crie um título profissional e atrativo para uma oferta comercial:
    
    INFORMAÇÕES DA OFERTA:
    - Estabelecimento: ${input.businessName}
    - Segmento: ${input.category}
    - Produto/Serviço: ${input.productOrService}
    - Desconto: ${discountPercentage}%
    - Preço original: R$ ${input.originalPrice.toFixed(2)}
    - Preço promocional: R$ ${input.discountedPrice.toFixed(2)}
    
    DIRETRIZES:
    - Máximo 60 caracteres
    - Linguagem profissional e objetiva
    - Destaque o percentual de desconto
    - Foco no benefício para o cliente
    - Evite gírias ou expressões regionais
    - Tom comercial e persuasivo
    
    Retorne apenas o título, sem aspas ou formatação adicional.
    `

    try {
      return await this.callGeminiFunction(prompt, 'title')
    } catch (error) {
      console.error('Erro ao gerar título:', error)
      return `${discountPercentage}% OFF em ${input.productOrService} - ${input.businessName}`
    }
  }

  async generateOfferDescription(input: OfferInput): Promise<string> {
    const discountPercentage = Math.round(((input.originalPrice - input.discountedPrice) / input.originalPrice) * 100)
    
    const prompt = `
    Crie uma descrição comercial persuasiva para uma oferta:
    
    INFORMAÇÕES DA OFERTA:
    - Estabelecimento: ${input.businessName}
    - Segmento: ${input.category}
    - Produto/Serviço: ${input.productOrService}
    - Desconto: ${discountPercentage}%
    - Preço original: R$ ${input.originalPrice.toFixed(2)}
    - Preço promocional: R$ ${input.discountedPrice.toFixed(2)}
    - Público-alvo: ${input.targetAudience || 'Consumidores em geral'}
    
    DIRETRIZES OBRIGATÓRIAS:
    - Entre 200 e 350 caracteres (IMPORTANTE: respeite este limite)
    - Linguagem profissional e objetiva
    - Utilize gatilhos de marketing: urgência, escassez, benefício exclusivo
    - Destaque o valor da economia e o benefício principal
    - Inclua um call-to-action claro no final
    - Evite gírias, expressões regionais ou linguagem informal
    - Tom comercial, direto e persuasivo
    - Pode usar 1-2 emojis estratégicos se apropriado
    
    ESTRUTURA SUGERIDA:
    [Benefício principal] + [Economia/desconto] + [Diferencial] + [Call-to-action]
    
    Retorne apenas a descrição, sem formatação adicional.
    `

    try {
      return await this.callGeminiFunction(prompt, 'description')
    } catch (error) {
      console.error('Erro ao gerar descrição:', error)
      return `Aproveite ${discountPercentage}% de desconto em ${input.productOrService} na ${input.businessName}. Economia garantida por tempo limitado. Não perca esta oportunidade exclusiva!`
    }
  }

  async generateAIDADescription(input: OfferInput): Promise<string> {
    const discountPercentage = Math.round(((input.originalPrice - input.discountedPrice) / input.originalPrice) * 100)
    
    const prompt = `
    Crie uma descrição comercial otimizada usando a metodologia AIDA (Atenção, Interesse, Desejo, Ação):
    
    INFORMAÇÕES DA OFERTA:
    - Estabelecimento: ${input.businessName}
    - Segmento: ${input.category}
    - Produto/Serviço: ${input.productOrService}
    - Desconto: ${discountPercentage}%
    - De R$ ${input.originalPrice.toFixed(2)} por R$ ${input.discountedPrice.toFixed(2)}
    - Público: ${input.targetAudience || 'Consumidores em geral'}
    
    ESTRUTURA AIDA OBRIGATÓRIA:
    
    1. ATENÇÃO (abertura): Gancho impactante com dado numérico ou benefício exclusivo
    2. INTERESSE (desenvolvimento): Apresente os benefícios únicos e relevância para o cliente
    3. DESEJO (conexão): Mostre o resultado/transformação que o cliente terá
    4. AÇÃO (fechamento): Call-to-action claro e urgente
    
    REQUISITOS OBRIGATÓRIOS:
    - Entre 280 e 400 caracteres (IMPORTANTE: respeite este limite)
    - Linguagem profissional e comercial
    - Evite gírias, expressões regionais ou linguagem informal
    - Use emojis estratégicos (máximo 3)
    - Aplique gatilhos: escassez, urgência, exclusividade, prova social
    - Tom persuasivo mas profissional
    - Cada elemento AIDA deve estar presente na descrição
    
    EXEMPLO DE ESTRUTURA:
    "[Emoji] [Gancho impactante com número/benefício]! [Benefícios exclusivos e diferenciais]. [Resultado/transformação para o cliente]. [Emoji] [Call-to-action urgente]!"
    
    Retorne APENAS a descrição final, sem explicações ou formatação adicional.
    `

    try {
      return await this.callGeminiFunction(prompt, 'aida')
    } catch (error) {
      console.error('Erro ao gerar descrição AIDA:', error)
      return `🎯 ${discountPercentage}% de desconto exclusivo em ${input.productOrService}! Qualidade premium com economia garantida na ${input.businessName}. Transforme sua experiência com esta oferta especial. ⚡ Aproveite agora - disponibilidade limitada!`
    }
  }

  async generateMarketingCopy(input: OfferInput & { copyType: 'social' | 'whatsapp' | 'email' }): Promise<string> {
    const discountPercentage = Math.round(((input.originalPrice - input.discountedPrice) / input.originalPrice) * 100)
    
    let promptContext = ''
    switch (input.copyType) {
      case 'social':
        promptContext = 'para redes sociais (Instagram, Facebook) com hashtags e emojis'
        break
      case 'whatsapp':
        promptContext = 'para WhatsApp, informal e direto'
        break
      case 'email':
        promptContext = 'para email marketing, mais formal e detalhado'
        break
    }

    const prompt = `
    Crie um copy de marketing ${promptContext} para:
    - Negócio: ${input.businessName}
    - Oferta: ${input.productOrService}
    - Desconto: ${discountPercentage}%
    - Preços: De R$ ${input.originalPrice.toFixed(2)} por R$ ${input.discountedPrice.toFixed(2)}
    - Categoria: ${input.category}
    
    O copy deve ser persuasivo, usar gatilhos mentais e adequado para a sua cidade.
    `

    try {
      return await this.callGeminiFunction(prompt, 'marketing')
    } catch (error) {
      console.error('Erro ao gerar copy:', error)
      return `🔥 OFERTA IMPERDÍVEL! ${discountPercentage}% OFF em ${input.productOrService} na ${input.businessName}`
    }
  }
}

export const geminiService = new GeminiService()