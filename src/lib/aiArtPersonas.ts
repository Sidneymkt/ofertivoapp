// Persona da Oferta — biblioteca de PESSOAS (personas humanas) usadas nas artes
// de ofertas, sorteios, cupons, banners e posts. Substitui completamente o antigo
// sistema de mascotes/ícones ilustrativos.

import { supabase } from '@/integrations/supabase/client';

export type PersonaGender = 'homem' | 'mulher' | 'crianca' | 'casal' | 'familia' | 'grupo';
export type PersonaAge = 'crianca' | 'jovem' | 'adulto' | 'idoso' | 'variado';
export type PersonaFraming = 'corpo-inteiro' | 'meio-corpo' | 'close';

export interface PersonaPreset {
  key: string;
  label: string;
  category: string;          // segmento comercial
  gender: PersonaGender;
  age: PersonaAge;
  framing: PersonaFraming;
  professional: boolean;     // profissional do segmento (vs. consumidor)
  diversity?: boolean;       // representa diversidade explícita
  prompt: string;            // descrição base da pessoa (pt-BR)
}

const p = (
  key: string,
  label: string,
  category: string,
  gender: PersonaGender,
  age: PersonaAge,
  framing: PersonaFraming,
  professional: boolean,
  prompt: string,
  diversity = false,
): PersonaPreset => ({ key, label, category, gender, age, framing, professional, prompt, diversity });

export const PERSONA_PRESETS: PersonaPreset[] = [
  // Restaurante / Alimentação
  p('chef_homem', 'Chef', 'Restaurante', 'homem', 'adulto', 'meio-corpo', true, 'um chef de cozinha brasileiro sorridente, dólmã branca impecável, apresentando um prato com a mão'),
  p('chef_mulher', 'Chef mulher', 'Restaurante', 'mulher', 'adulto', 'meio-corpo', true, 'uma chef brasileira confiante, dólmã branca, sorriso acolhedor, gesto de apresentação'),
  p('garcom', 'Garçom', 'Restaurante', 'homem', 'jovem', 'corpo-inteiro', true, 'um garçom simpático de camisa social e avental, segurando bandeja com pedido'),
  p('garconete', 'Garçonete', 'Restaurante', 'mulher', 'jovem', 'corpo-inteiro', true, 'uma garçonete simpática de avental, segurando bandeja, sorriso caloroso'),
  p('familia_jantar', 'Família jantando', 'Restaurante', 'familia', 'variado', 'meio-corpo', false, 'uma família brasileira feliz à mesa, pais e duas crianças, sorrindo durante a refeição', true),
  p('casal_jantar', 'Casal jantando', 'Restaurante', 'casal', 'adulto', 'meio-corpo', false, 'um casal jovem brasileiro sorrindo em jantar romântico, brindando'),

  // Pizzaria / Hamburgueria / Sorveteria / Padaria / Cafeteria / Delivery
  p('pizzaiolo', 'Pizzaiolo', 'Pizzaria', 'homem', 'adulto', 'meio-corpo', true, 'um pizzaiolo brasileiro sorridente segurando pizza fresca em pá de madeira'),
  p('jovens_burger', 'Jovens com hambúrguer', 'Hamburgueria', 'grupo', 'jovem', 'meio-corpo', false, 'dois amigos jovens brasileiros animados comendo hambúrguer artesanal, expressão de prazer', true),
  p('crianca_sorvete', 'Criança com sorvete', 'Sorveteria', 'crianca', 'crianca', 'meio-corpo', false, 'uma criança brasileira alegre segurando casquinha de sorvete colorido'),
  p('familia_sorvete', 'Família na sorveteria', 'Sorveteria', 'familia', 'variado', 'meio-corpo', false, 'uma família brasileira feliz tomando sorvete junta', true),
  p('padeiro', 'Padeiro', 'Padaria', 'homem', 'adulto', 'meio-corpo', true, 'um padeiro brasileiro sorridente com touca, segurando cesta de pães quentinhos'),
  p('barista', 'Barista', 'Cafeteria', 'mulher', 'jovem', 'meio-corpo', true, 'uma barista estilosa segurando xícara de café com latte art, sorriso simpático'),
  p('entregador', 'Entregador', 'Delivery', 'homem', 'jovem', 'corpo-inteiro', true, 'um entregador brasileiro de capacete e bag térmica, entregando pedido com sorriso'),
  p('churrasqueiro', 'Churrasqueiro', 'Churrascaria', 'homem', 'adulto', 'meio-corpo', true, 'um churrasqueiro brasileiro segurando espeto de picanha, avental, sorriso confiante'),

  // Academia / Bem-estar
  p('personal', 'Personal trainer', 'Academia', 'homem', 'adulto', 'corpo-inteiro', true, 'um personal trainer brasileiro atlético de camiseta esportiva, postura motivadora'),
  p('mulher_treino', 'Mulher treinando', 'Academia', 'mulher', 'jovem', 'corpo-inteiro', false, 'uma mulher brasileira em roupa fitness treinando com halteres, expressão determinada'),
  p('atleta', 'Atleta', 'Academia', 'homem', 'jovem', 'corpo-inteiro', false, 'um atleta brasileiro em roupa esportiva, corpo definido, pose vitoriosa', true),
  p('yoga', 'Instrutora de yoga', 'Bem-estar', 'mulher', 'adulto', 'corpo-inteiro', true, 'uma instrutora de yoga serena em pose de meditação, roupa leve'),

  // Beleza
  p('barbeiro_cliente', 'Barbeiro e cliente', 'Barbearia', 'grupo', 'adulto', 'meio-corpo', true, 'um barbeiro brasileiro finalizando o corte de um cliente satisfeito na cadeira de barbearia'),
  p('barbeiro', 'Barbeiro', 'Barbearia', 'homem', 'adulto', 'meio-corpo', true, 'um barbeiro brasileiro estiloso com tesoura e pente, avental de barbearia, sorriso confiante'),
  p('cabeleireira', 'Cabeleireira', 'Salão de Beleza', 'mulher', 'adulto', 'meio-corpo', true, 'uma cabeleireira brasileira finalizando o cabelo de uma cliente sorridente'),
  p('cliente_salao', 'Cliente do salão', 'Salão de Beleza', 'mulher', 'jovem', 'close', false, 'uma mulher brasileira com cabelo recém-finalizado, sorriso radiante, look moderno', true),
  p('manicure', 'Manicure', 'Salão de Beleza', 'mulher', 'adulto', 'meio-corpo', true, 'uma manicure brasileira cuidando das unhas de uma cliente, ambiente clean'),
  p('esteticista', 'Esteticista', 'Estética', 'mulher', 'adulto', 'meio-corpo', true, 'uma esteticista de jaleco branco sorridente em clínica de estética moderna'),

  // Moda / Varejo
  p('modelo_feminina', 'Modelo feminina', 'Loja de Roupas', 'mulher', 'jovem', 'corpo-inteiro', false, 'uma modelo brasileira estilosa com sacolas de compras, pose de moda urbana', true),
  p('modelo_masculino', 'Modelo masculino', 'Loja de Roupas', 'homem', 'jovem', 'corpo-inteiro', false, 'um modelo brasileiro estiloso com look casual moderno, pose confiante'),
  p('vendedora', 'Vendedora', 'Varejo', 'mulher', 'adulto', 'meio-corpo', true, 'uma vendedora brasileira simpática de crachá, apresentando produto com a mão'),
  p('familia_compras', 'Família fazendo compras', 'Supermercado', 'familia', 'variado', 'corpo-inteiro', false, 'uma família brasileira empurrando carrinho de supermercado, todos sorrindo', true),
  p('repositor', 'Atendente de mercado', 'Supermercado', 'homem', 'jovem', 'meio-corpo', true, 'um atendente de supermercado de uniforme, sorrindo e mostrando produto'),

  // Saúde
  p('farmaceutico', 'Farmacêutico', 'Farmácia', 'homem', 'adulto', 'meio-corpo', true, 'um farmacêutico brasileiro de jaleco branco, sorriso acolhedor, atendendo no balcão'),
  p('farmaceutica', 'Farmacêutica', 'Farmácia', 'mulher', 'adulto', 'meio-corpo', true, 'uma farmacêutica de jaleco branco, expressão gentil, segurando medicamento'),
  p('dentista', 'Dentista', 'Clínica Odontológica', 'mulher', 'adulto', 'meio-corpo', true, 'uma dentista brasileira de jaleco, luvas, sorriso confiante em consultório moderno'),
  p('medico', 'Médico', 'Clínica Médica', 'homem', 'adulto', 'meio-corpo', true, 'um médico brasileiro de jaleco branco com estetoscópio, expressão confiável'),
  p('medica', 'Médica', 'Clínica Médica', 'mulher', 'adulto', 'meio-corpo', true, 'uma médica brasileira de jaleco branco com estetoscópio, sorriso acolhedor', true),
  p('idoso_saude', 'Idoso saudável', 'Saúde', 'homem', 'idoso', 'meio-corpo', false, 'um senhor brasileiro de cabelos grisalhos, saudável e sorridente'),

  // Pet
  p('veterinario', 'Veterinário', 'Pet Shop', 'homem', 'adulto', 'meio-corpo', true, 'um veterinário brasileiro de jaleco segurando um cachorro pequeno, ambos felizes'),
  p('tutor_pet', 'Tutor com pet', 'Pet Shop', 'mulher', 'jovem', 'meio-corpo', false, 'uma jovem brasileira abraçando seu cachorro, ambos alegres'),

  // Serviços / Automotivo / Construção
  p('mecanico', 'Mecânico', 'Oficina', 'homem', 'adulto', 'meio-corpo', true, 'um mecânico brasileiro de macacão azul segurando chave inglesa, polegar para cima'),
  p('lavajato', 'Funcionário lava jato', 'Lava Jato', 'homem', 'jovem', 'corpo-inteiro', true, 'um funcionário de lava jato lavando um carro com espuma, uniforme, sorrindo'),
  p('pedreiro', 'Pedreiro', 'Material de Construção', 'homem', 'adulto', 'corpo-inteiro', true, 'um pedreiro brasileiro de capacete e colete, ferramentas na mão, sorriso confiante'),
  p('arquiteta', 'Arquiteta', 'Material de Construção', 'mulher', 'adulto', 'meio-corpo', true, 'uma arquiteta brasileira com planta na mão e capacete, ambiente de obra'),
  p('eletricista', 'Eletricista', 'Serviços', 'homem', 'adulto', 'meio-corpo', true, 'um eletricista brasileiro uniformizado com ferramentas, expressão profissional'),

  // Educação / Turismo / Hotelaria
  p('professor', 'Professor e alunos', 'Escola', 'grupo', 'variado', 'meio-corpo', true, 'um professor brasileiro sorridente com dois alunos atentos em sala de aula', true),
  p('instrutor_auto', 'Instrutor auto escola', 'Auto Escola', 'homem', 'adulto', 'meio-corpo', true, 'um instrutor de auto escola ao lado de aluno no carro, prancheta na mão, sorriso'),
  p('recepcionista', 'Recepcionista', 'Hotel', 'mulher', 'jovem', 'meio-corpo', true, 'uma recepcionista de hotel uniformizada, sorriso profissional atrás do balcão'),
  p('casal_viagem', 'Casal viajando', 'Agência de Turismo', 'casal', 'jovem', 'corpo-inteiro', false, 'um casal brasileiro feliz com malas de viagem e chapéu de sol, clima de férias', true),

  // Genéricos / promoção
  p('cliente_feliz', 'Cliente feliz', 'Geral', 'mulher', 'jovem', 'meio-corpo', false, 'uma consumidora brasileira animada apontando para o lado com expressão de surpresa e alegria', true),
  p('homem_placa', 'Pessoa com placa', 'Geral', 'homem', 'adulto', 'corpo-inteiro', false, 'um homem brasileiro sorridente segurando uma placa promocional em branco'),
  p('grupo_amigos', 'Grupo de amigos', 'Geral', 'grupo', 'jovem', 'meio-corpo', false, 'um grupo diverso de amigos brasileiros comemorando com os braços erguidos', true),
  p('senhora_compras', 'Senhora satisfeita', 'Geral', 'mulher', 'idoso', 'meio-corpo', false, 'uma senhora brasileira sorridente com sacola de compras, expressão satisfeita'),
];

// ---------------- Estilos e fundos ----------------

export const PERSONA_STYLES: { key: string; label: string; prompt: string }[] = [
  { key: 'realista', label: 'Foto realista', prompt: 'fotografia realista de alta resolução, pele natural, lente 50mm, profundidade de campo suave' },
  { key: 'publicitario', label: 'Estilo publicitário', prompt: 'fotografia publicitária premium, iluminação de campanha, cores vivas, alto contraste' },
  { key: 'lifestyle', label: 'Lifestyle', prompt: 'fotografia lifestyle espontânea, luz natural, clima autêntico e cotidiano' },
  { key: 'estudio', label: 'Estúdio fotográfico', prompt: 'retrato de estúdio profissional, softbox, sombras controladas, acabamento editorial' },
];

export const PERSONA_BACKGROUNDS: { key: string; label: string; prompt: string }[] = [
  { key: 'transparente', label: 'Fundo transparente', prompt: 'recorte da pessoa sobre fundo TOTALMENTE BRANCO liso (#FFFFFF), sem cenário e sem sombra projetada no fundo' },
  { key: 'loja', label: 'Fundo da loja', prompt: 'ao fundo o ambiente real do estabelecimento, levemente desfocado (bokeh)' },
  { key: 'ia', label: 'Fundo gerado por IA', prompt: 'cenário moderno gerado por IA coerente com o segmento, desfocado para destacar a pessoa' },
  { key: 'solido', label: 'Fundo sólido', prompt: 'fundo de cor sólida uniforme de estúdio, sem elementos' },
];

export const PERSONA_ACTIONS: { key: string; label: string; prompt: string }[] = [
  { key: 'apresentando', label: 'Apresentando a oferta', prompt: 'apresentando a oferta com a mão aberta para o lado' },
  { key: 'segurando_produto', label: 'Segurando o produto', prompt: 'segurando o produto do anúncio em destaque' },
  { key: 'apontando', label: 'Apontando para o desconto', prompt: 'apontando com o dedo para o espaço lateral onde fica o desconto' },
  { key: 'comemorando', label: 'Comemorando', prompt: 'comemorando com o punho erguido, expressão de entusiasmo' },
  { key: 'placa', label: 'Com placa promocional', prompt: 'segurando uma placa promocional em branco (sem texto)' },
  { key: 'sorrindo', label: 'Sorrindo para a câmera', prompt: 'sorrindo diretamente para a câmera, postura acolhedora' },
];

export const PERSONA_OPTIONS = {
  gender: [
    { key: '', label: 'Automático' },
    { key: 'homem', label: 'Homem' },
    { key: 'mulher', label: 'Mulher' },
    { key: 'casal', label: 'Casal' },
    { key: 'familia', label: 'Família' },
    { key: 'grupo', label: 'Grupo' },
  ],
  age: [
    { key: '', label: 'Automático' },
    { key: 'crianca', label: 'Criança' },
    { key: 'jovem', label: 'Jovem (18-30)' },
    { key: 'adulto', label: 'Adulto (30-55)' },
    { key: 'idoso', label: 'Idoso (55+)' },
  ],
  skin: [
    { key: '', label: 'Automático' },
    { key: 'clara', label: 'Pele clara' },
    { key: 'parda', label: 'Pele parda' },
    { key: 'negra', label: 'Pele negra' },
    { key: 'indigena', label: 'Traços indígenas' },
    { key: 'asiatica', label: 'Traços asiáticos' },
  ],
  outfit: [
    { key: '', label: 'Automático' },
    { key: 'uniforme', label: 'Uniforme do segmento' },
    { key: 'casual', label: 'Casual moderno' },
    { key: 'social', label: 'Social / executivo' },
    { key: 'esportivo', label: 'Esportivo' },
    { key: 'jaleco', label: 'Jaleco profissional' },
  ],
  expression: [
    { key: '', label: 'Automático' },
    { key: 'sorriso', label: 'Sorriso aberto' },
    { key: 'confiante', label: 'Confiante' },
    { key: 'surpresa', label: 'Surpresa positiva' },
    { key: 'acolhedor', label: 'Acolhedor' },
  ],
  gaze: [
    { key: '', label: 'Automático' },
    { key: 'camera', label: 'Olhando para a câmera' },
    { key: 'produto', label: 'Olhando para o produto' },
    { key: 'lateral', label: 'Olhando para o lado do texto' },
  ],
  framing: [
    { key: '', label: 'Automático' },
    { key: 'corpo-inteiro', label: 'Corpo inteiro' },
    { key: 'meio-corpo', label: 'Meio corpo' },
    { key: 'close', label: 'Close' },
  ],
} as const;

export interface PersonaCustomization {
  gender?: string;
  age?: string;
  skin?: string;
  outfit?: string;
  expression?: string;
  gaze?: string;
  framing?: string;
  action?: string;   // key de PERSONA_ACTIONS
  style?: string;    // key de PERSONA_STYLES
  background?: string; // key de PERSONA_BACKGROUNDS
}

const LABEL = (list: readonly { key: string; label: string }[], key?: string) =>
  list.find((o) => o.key === key)?.label;

export function buildPersonaPrompt(
  base: string,
  opts: PersonaCustomization = {},
  context?: { businessName?: string; category?: string },
): string {
  if (!base?.trim()) return '';
  const parts: string[] = [base.trim()];

  if (opts.gender) parts.push(`gênero: ${LABEL(PERSONA_OPTIONS.gender, opts.gender)}`);
  if (opts.age) parts.push(`faixa etária: ${LABEL(PERSONA_OPTIONS.age, opts.age)}`);
  if (opts.skin) parts.push(`${LABEL(PERSONA_OPTIONS.skin, opts.skin)}`);
  if (opts.outfit) parts.push(`roupa: ${LABEL(PERSONA_OPTIONS.outfit, opts.outfit)}`);
  if (opts.expression) parts.push(`expressão: ${LABEL(PERSONA_OPTIONS.expression, opts.expression)}`);
  if (opts.gaze) parts.push(`${LABEL(PERSONA_OPTIONS.gaze, opts.gaze)}`);
  if (opts.framing) parts.push(`enquadramento: ${LABEL(PERSONA_OPTIONS.framing, opts.framing)}`);

  const action = PERSONA_ACTIONS.find((a) => a.key === (opts.action || 'apresentando'));
  if (action) parts.push(action.prompt);

  const style = PERSONA_STYLES.find((s) => s.key === (opts.style || 'publicitario'));
  if (style) parts.push(style.prompt);

  const bg = PERSONA_BACKGROUNDS.find((b) => b.key === (opts.background || 'transparente'));
  if (bg) parts.push(bg.prompt);

  if (context?.category) parts.push(`contexto do segmento: ${context.category}`);

  parts.push('pessoa real brasileira, NUNCA mascote, NUNCA desenho, NUNCA ilustração, NUNCA emoji, sem texto na imagem');

  return parts.join(', ');
}

// ---------------- Persona automática por categoria ----------------

const CATEGORY_TO_PERSONA: Record<string, string> = {
  restaurante: 'chef_homem',
  alimentacao: 'chef_homem',
  comida: 'chef_homem',
  lanchonete: 'jovens_burger',
  hamburgueria: 'jovens_burger',
  pizzaria: 'pizzaiolo',
  sorveteria: 'crianca_sorvete',
  acai: 'crianca_sorvete',
  padaria: 'padeiro',
  cafeteria: 'barista',
  cafe: 'barista',
  churrascaria: 'churrasqueiro',
  delivery: 'entregador',
  academia: 'personal',
  fitness: 'personal',
  bemestar: 'yoga',
  barbearia: 'barbeiro_cliente',
  barbeiro: 'barbeiro_cliente',
  salao: 'cabeleireira',
  beleza: 'cabeleireira',
  estetica: 'esteticista',
  manicure: 'manicure',
  roupas: 'modelo_feminina',
  moda: 'modelo_feminina',
  vestuario: 'modelo_masculino',
  calcados: 'modelo_masculino',
  loja: 'vendedora',
  varejo: 'vendedora',
  supermercado: 'familia_compras',
  mercado: 'familia_compras',
  hortifruti: 'familia_compras',
  farmacia: 'farmaceutico',
  drogaria: 'farmaceutica',
  odontologia: 'dentista',
  dentista: 'dentista',
  clinica: 'medico',
  saude: 'medica',
  petshop: 'veterinario',
  pet: 'veterinario',
  veterinaria: 'veterinario',
  oficina: 'mecanico',
  automotivo: 'mecanico',
  mecanica: 'mecanico',
  lavajato: 'lavajato',
  construcao: 'pedreiro',
  materialdeconstrucao: 'pedreiro',
  arquitetura: 'arquiteta',
  eletrica: 'eletricista',
  servicos: 'eletricista',
  escola: 'professor',
  educacao: 'professor',
  curso: 'professor',
  autoescola: 'instrutor_auto',
  hotel: 'recepcionista',
  pousada: 'recepcionista',
  turismo: 'casal_viagem',
  viagem: 'casal_viagem',
};

export function suggestPersonaFor(category?: string | null): string {
  if (!category) return 'cliente_feliz';
  const norm = category
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  for (const key of Object.keys(CATEGORY_TO_PERSONA)) {
    if (norm.includes(key)) return CATEGORY_TO_PERSONA[key];
  }
  return 'cliente_feliz';
}

export function getPersonaBasePrompt(key: string, custom?: string): string {
  if (key === 'custom' && custom?.trim()) return custom.trim();
  if (key === 'uploaded') return '';
  return PERSONA_PRESETS.find((x) => x.key === key)?.prompt || '';
}

export const PERSONA_CATEGORIES = Array.from(new Set(PERSONA_PRESETS.map((x) => x.category))).sort();

// ---------------- Persona enviada pelo anunciante ----------------

const CACHE_PREFIX = 'ai_art_persona';
const cacheKey = (businessId?: string | null) =>
  businessId ? `${CACHE_PREFIX}:${businessId}` : CACHE_PREFIX;

export function getUploadedPersona(businessId?: string | null): string | null {
  try {
    return localStorage.getItem(cacheKey(businessId));
  } catch {
    return null;
  }
}

function writeCache(businessId: string | null | undefined, url: string | null) {
  try {
    const k = cacheKey(businessId);
    if (url) localStorage.setItem(k, url);
    else localStorage.removeItem(k);
  } catch {}
}

export async function loadUploadedPersona(businessId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('businesses')
      .select('custom_mascot_url')
      .eq('id', businessId)
      .maybeSingle();
    const url = (data as any)?.custom_mascot_url || null;
    writeCache(businessId, url);
    return url;
  } catch {
    return getUploadedPersona(businessId);
  }
}

export async function uploadPersonaForBusiness(businessId: string, file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) throw new Error('Faça login para salvar sua persona');
  const path = `${uid}/persona-${businessId}-${Date.now()}.png`;
  // Caminho sempre único dentro da pasta do próprio usuário: usa apenas INSERT,
  // evitando depender da policy de UPDATE do storage (causa do erro de RLS).
  const { error: upErr } = await supabase.storage
    .from('offer-ai-assets')
    .upload(path, file, { upsert: false, contentType: 'image/png' });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from('offer-ai-assets').getPublicUrl(path);

  const url = pub.publicUrl;
  const { error: updErr } = await supabase
    .from('businesses')
    .update({ custom_mascot_url: url } as any)
    .eq('id', businessId);
  if (updErr) throw updErr;
  writeCache(businessId, url);
  return url;
}

export async function clearUploadedPersona(businessId: string): Promise<void> {
  await supabase.from('businesses').update({ custom_mascot_url: null } as any).eq('id', businessId);
  writeCache(businessId, null);
}

// ---------------- Tratamento da foto enviada ----------------

export interface PersonaCropOptions {
  zoom?: number;      // 1 = enquadramento detectado
  offsetX?: number;   // -1..1 deslocamento horizontal
  offsetY?: number;   // -1..1 deslocamento vertical
  removeBackground?: boolean;
  size?: number;      // lado do quadrado final
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Detecta rosto quando o navegador suporta FaceDetector; senão usa o terço superior.
async function detectFaceCenter(img: HTMLImageElement): Promise<{ x: number; y: number }> {
  const fallback = { x: img.width / 2, y: img.height * 0.38 };
  try {
    const FD = (window as any).FaceDetector;
    if (!FD) return fallback;
    const det = new FD({ fastMode: true, maxDetectedFaces: 1 });
    const faces = await det.detect(img);
    const f = faces?.[0]?.boundingBox;
    if (!f) return fallback;
    return { x: f.x + f.width / 2, y: f.y + f.height / 2 };
  } catch {
    return fallback;
  }
}

// Remove fundo aproximado por similaridade com as bordas (chroma/flood simples).
function removeBackgroundApprox(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const cx = canvas.getContext('2d')!;
  try {
    const id = cx.getImageData(0, 0, canvas.width, canvas.height);
    const d = id.data;
    const idx = (x: number, y: number) => (y * canvas.width + x) * 4;
    // cor média das bordas
    let r = 0, g = 0, b = 0, n = 0;
    for (let x = 0; x < canvas.width; x += 4) {
      for (const y of [0, canvas.height - 1]) {
        const i = idx(x, y); r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    }
    for (let y = 0; y < canvas.height; y += 4) {
      for (const x of [0, canvas.width - 1]) {
        const i = idx(x, y); r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      }
    }
    r /= n; g /= n; b /= n;
    const TOL = 46;
    for (let i = 0; i < d.length; i += 4) {
      const dist = Math.sqrt((d[i] - r) ** 2 + (d[i + 1] - g) ** 2 + (d[i + 2] - b) ** 2);
      if (dist < TOL) d[i + 3] = 0;
      else if (dist < TOL * 1.6) d[i + 3] = Math.round(d[i + 3] * ((dist - TOL) / (TOL * 0.6)));
    }
    cx.putImageData(id, 0, 0);
  } catch {}
  return canvas;
}

// Recorta, centraliza no rosto, remove fundo (opcional) e devolve PNG pronto.
export async function preparePersonaFile(
  file: File,
  opts: PersonaCropOptions = {},
): Promise<{ file: File; dataUrl: string }> {
  const { zoom = 1, offsetX = 0, offsetY = 0, removeBackground = true, size = 768 } = opts;
  const img = await loadImageEl(await fileToDataUrl(file));
  const face = await detectFaceCenter(img);

  const base = Math.min(img.width, img.height);
  const crop = Math.max(64, base / Math.max(0.5, zoom));
  let sx = face.x - crop / 2 + offsetX * crop * 0.5;
  let sy = face.y - crop * 0.35 + offsetY * crop * 0.5;
  sx = Math.max(0, Math.min(img.width - crop, sx));
  sy = Math.max(0, Math.min(Math.max(0, img.height - crop), sy));

  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cx = c.getContext('2d')!;
  cx.drawImage(img, sx, sy, crop, crop, 0, 0, size, size);

  if (removeBackground) removeBackgroundApprox(c);

  const dataUrl = c.toDataURL('image/png');
  const blob = await (await fetch(dataUrl)).blob();
  return { file: new File([blob], 'persona.png', { type: 'image/png' }), dataUrl };
}
