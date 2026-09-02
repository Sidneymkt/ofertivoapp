/**
 * Geração local (sem IA) de textos de divulgação e melhorias de oferta.
 * Usado como fallback quando a IA está indisponível (sem créditos / limite atingido).
 */

export interface OfferCopyInput {
  title: string;
  description?: string;
  category?: string;
  businessName: string;
  originalPrice: number;
  discountedPrice: number;
  offerUrl?: string;
}

const CATEGORY_TAGS: Record<string, string[]> = {
  alimentacao: ['#comidaboa', '#delivery'],
  restaurante: ['#restaurante', '#comidaboa'],
  beleza: ['#beleza', '#autocuidado'],
  moda: ['#moda', '#estilo'],
  servicos: ['#servicos', '#qualidade'],
  automotivo: ['#automotivo', '#carroemoto'],
};

const discountOf = (o: OfferCopyInput) =>
  o.originalPrice > 0
    ? Math.max(0, Math.round(((o.originalPrice - o.discountedPrice) / o.originalPrice) * 100))
    : 0;

const money = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

const clamp = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`);

export function buildLocalHashtags(o: OfferCopyInput): string[] {
  const key = (o.category || '').toLowerCase();
  const extra = Object.keys(CATEGORY_TAGS).find((k) => key.includes(k));
  return ['#ofertivo', '#manaus', '#promocao', ...(extra ? CATEGORY_TAGS[extra] : ['#oferta', '#desconto'])].slice(0, 5);
}

export function buildLocalSocialContent(o: OfferCopyInput) {
  const d = discountOf(o);
  const price = money(o.discountedPrice);
  const from = money(o.originalPrice);
  const dTxt = d > 0 ? `${d}% OFF` : 'Oferta especial';

  return {
    short: clamp(`🔥 ${dTxt}! ${o.title} por ${price} na ${o.businessName}. Corre que é por tempo limitado! 👉`, 140),
    emoji: clamp(
      `🚨 ${dTxt} 🚨\n${o.title}\n💰 De ${from} por ${price}\n📍 ${o.businessName}\n⏳ Aproveite antes que acabe!`,
      200,
    ),
    formal: clamp(
      `${o.businessName} apresenta: ${o.title}. De ${from} por ${price}${d > 0 ? ` (${d}% de desconto)` : ''}. Condição válida por tempo limitado.`,
      180,
    ),
    hashtags: buildLocalHashtags(o),
    bestTime: '18:00',
    audienceTip: 'Clientes próximos ao seu bairro, entre 18h e 21h, no celular.',
  };
}

export function buildLocalOfferImprovement(o: OfferCopyInput) {
  const d = discountOf(o);
  const price = money(o.discountedPrice);
  const base = o.title.replace(/^\s*\d+%\s*OFF\s*(em|de)?\s*/i, '').trim();

  return {
    title: clamp(d > 0 ? `${d}% OFF em ${base} — só hoje!` : `${base} com condição especial`, 60),
    description: clamp(
      `${o.description ? `${o.description.trim()} ` : ''}Garanta ${base} por apenas ${price} na ${o.businessName}. Vagas/estoque limitados — aproveite agora!`,
      180,
    ),
    cta: d > 0 ? 'Quero meu desconto' : 'Quero aproveitar',
    hashtags: buildLocalHashtags(o),
    bestTime: '18:00',
    imageDescription: 'Foto real do produto/serviço em close, boa iluminação e fundo limpo.',
  };
}
