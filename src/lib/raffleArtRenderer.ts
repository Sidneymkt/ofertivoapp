import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

// Busca a PERSONA (pessoa real) em PNG via edge function; cache por prompt.
const personaCache = new Map<string, string>();
export let lastPersonaError: string | null = null;
export const getPersonaError = () => lastPersonaError;

// Traduz o erro técnico da edge function em mensagem clara ao anunciante.
export function personaErrorMessage(raw?: string | null): string {
  const s = (raw || '').toLowerCase();
  if (s.includes('persona_ai_disabled') || s.includes('403')) {
    return 'A geração automática de personas por IA está desativada pelo administrador. Use a biblioteca de personas prontas ou envie sua foto (PNG).';
  }
  if (s.includes('402') || s.includes('payment_required') || s.includes('credits')) {
    return 'Créditos de IA esgotados. Adicione créditos em Configurações → Planos & créditos para gerar personas.';
  }
  if (s.includes('429') || s.includes('rate')) return 'Muitas gerações seguidas. Aguarde alguns segundos e tente novamente.';
  if (s.includes('unauthorized') || s.includes('401')) return 'Sessão expirada. Entre novamente para gerar a persona.';
  if (s.includes('content_policy') || s.includes('moderation')) return 'A descrição da persona foi recusada. Ajuste o texto e tente de novo.';
  return 'Não foi possível gerar a persona agora. Tente novamente em instantes.';
}

async function readFunctionError(error: any, data: any): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.text === 'function') {
      const body = await ctx.text();
      if (body) return `${ctx.status ?? ''} ${body}`.trim();
    }
    if (ctx?.status) return String(ctx.status);
  } catch {}
  return (data as any)?.error || error?.message || 'persona_unavailable';
}

export async function fetchPersonaDataUrl(prompt: string, opts?: { force?: boolean }): Promise<string | null> {
  if (!prompt?.trim()) return null;
  if (opts?.force) {
    personaCache.delete(prompt);
    try { sessionStorage.removeItem(`persona:${prompt}`); } catch {}
  } else {
    if (personaCache.has(prompt)) return personaCache.get(prompt)!;
    try {
      const ss = sessionStorage.getItem(`persona:${prompt}`);
      if (ss) { personaCache.set(prompt, ss); return ss; }
    } catch {}
  }
  try {
    lastPersonaError = null;
    const { data, error } = await supabase.functions.invoke('generate-persona-image', {
      body: { prompt },
    });
    if (error || !data?.b64_json) {
      lastPersonaError = await readFunctionError(error, data);
      console.warn('[persona] geração indisponível:', lastPersonaError);
      return null;
    }
    const url = `data:image/png;base64,${data.b64_json}`;
    personaCache.set(prompt, url);
    try { sessionStorage.setItem(`persona:${prompt}`, url); } catch {}
    return url;
  } catch (e: any) {
    lastPersonaError = e?.message || 'persona_unavailable';
    return null;
  }
}



// Remove near-white background from a mascot image to make it feel transparent.
function keyOutWhite(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const cx = c.getContext('2d')!;
  cx.drawImage(img, 0, 0);
  try {
    const id = cx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      if (r > 240 && g > 240 && b > 240) { d[i+3] = 0; }
      else if (r > 220 && g > 220 && b > 220) { d[i+3] = 90; }
    }
    cx.putImageData(id, 0, 0);
  } catch {}
  return c;
}


export type RaffleFormat = 'post' | 'story' | 'a4' | 'a3';

export const RAFFLE_FORMATS: {
  key: RaffleFormat;
  label: string;
  w: number;
  h: number;
  print: boolean;
}[] = [
  { key: 'post', label: 'Post 1080×1080', w: 1080, h: 1080, print: false },
  { key: 'story', label: 'Story 1080×1920', w: 1080, h: 1920, print: false },
  { key: 'a4', label: 'Cartaz A4', w: 2480, h: 3508, print: true },
  { key: 'a3', label: 'Cartaz A3', w: 3508, h: 4961, print: true },
];

export interface RaffleArtParams {
  format: RaffleFormat;
  title: string;
  prize: string;
  description?: string;
  entryCost: number;
  endDate: string;
  imageUrl?: string;
  businessName: string;
  businessLogoUrl?: string;
  qrUrl: string;
  theme?: 'dark' | 'gold' | 'vibrant' | 'sunset' | 'ocean' | 'emerald' | 'neon' | 'coral' | 'midnight' | 'mono';
  personaImageUrl?: string; // foto enviada pelo anunciante (prioridade)
  /** Multiplicador de tamanho da persona na arte (0.6 – 1.5). */
  personaScale?: number;
  /** Espelha a persona horizontalmente. */
  personaFlip?: boolean;

}


function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 4) {
      last = last.slice(0, -1);
    }
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function fitLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxLines: number,
  startSize: number,
  weight: string,
  family: string,
  lh = 1.1,
): { size: number; lines: string[] } {
  let size = startSize;
  for (let i = 0; i < 30; i++) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapLines(ctx, text, maxWidth, maxLines);
    const total = lines.length * size * lh;
    if (total <= maxHeight) {
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (widest <= maxWidth) return { size, lines };
    }
    size = Math.floor(size * 0.92);
    if (size < 14) break;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return { size, lines: wrapLines(ctx, text, maxWidth, maxLines) };
}

const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

const THEMES = {
  dark:     { bg1: '#0B1220', bg2: '#0D1520', accent: '#3B82F6', gold: '#F5B301' },
  gold:     { bg1: '#1a0f00', bg2: '#3a2600', accent: '#F5B301', gold: '#FFD54A' },
  vibrant:  { bg1: '#5b21b6', bg2: '#1e3a8a', accent: '#22c55e', gold: '#F5B301' },
  sunset:   { bg1: '#6c1e1e', bg2: '#c2410c', accent: '#fb923c', gold: '#fde047' },
  ocean:    { bg1: '#0c2340', bg2: '#0d4a6e', accent: '#22d3ee', gold: '#67e8f9' },
  emerald:  { bg1: '#064e3b', bg2: '#065f46', accent: '#10b981', gold: '#fbbf24' },
  neon:     { bg1: '#0a0a0a', bg2: '#1a0033', accent: '#ec4899', gold: '#a3e635' },
  coral:    { bg1: '#7f1d1d', bg2: '#ec4899', accent: '#fb7185', gold: '#fde68a' },
  midnight: { bg1: '#020617', bg2: '#1e1b4b', accent: '#818cf8', gold: '#e0e7ff' },
  mono:     { bg1: '#0a0a0a', bg2: '#262626', accent: '#f5f5f5', gold: '#fafafa' },
};

export async function renderRaffleArt(
  params: RaffleArtParams,
): Promise<HTMLCanvasElement> {
  const fmt = RAFFLE_FORMATS.find((f) => f.key === params.format)!;
  const W = fmt.w;
  const H = fmt.h;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const theme = THEMES[params.theme || 'dark'];
  const isTall = H > W;

  // BG base
  const baseGrad = ctx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, theme.bg1);
  baseGrad.addColorStop(1, theme.bg2);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // Hero image area (top ~55%) — either offer image or decorative gradient
  const heroH = Math.round(H * (isTall ? 0.52 : 0.48));
  if (params.imageUrl) {
    try {
      const img = await loadImage(params.imageUrl);
      const r = Math.max(W / img.width, heroH / img.height);
      const dw = img.width * r;
      const dh = img.height * r;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, heroH);
      ctx.clip();
      ctx.drawImage(img, (W - dw) / 2, (heroH - dh) / 2, dw, dh);
      ctx.restore();
    } catch {
      // fallback keeps base bg
    }
  } else {
    // Decorative diagonal accent
    ctx.fillStyle = theme.accent + '22';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, heroH * 0.6);
    ctx.lineTo(0, heroH);
    ctx.closePath();
    ctx.fill();
  }

  // Fade to base at bottom of hero
  const fade = ctx.createLinearGradient(0, heroH - Math.round(H * 0.15), 0, heroH + Math.round(H * 0.02));
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, theme.bg2);
  ctx.fillStyle = fade;
  ctx.fillRect(0, heroH - Math.round(H * 0.15), W, Math.round(H * 0.17));

  const pad = Math.round(W * 0.06);

  // Top badge "SORTEIO"
  const badgeText = 'SORTEIO';
  const badgeSize = Math.round(W * 0.028);
  ctx.font = `900 ${badgeSize}px ${FONT}`;
  const tw = ctx.measureText(badgeText).width;
  const bpx = badgeSize * 1.1;
  const bpy = badgeSize * 0.55;
  ctx.fillStyle = theme.gold;
  roundedRect(ctx, pad, pad, tw + bpx * 2, badgeSize + bpy * 2, (badgeSize + bpy * 2) / 2);
  ctx.fill();
  ctx.fillStyle = '#0B1220';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(badgeText, pad + bpx, pad + (badgeSize + bpy * 2) / 2);

  // Business logo (top-right, discreet)
  const logoBox = Math.round(W * 0.11);
  if (params.businessLogoUrl) {
    try {
      const logo = await loadImage(params.businessLogoUrl);
      const lx = W - pad - logoBox;
      const ly = pad;
      ctx.save();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(lx + logoBox / 2, ly + logoBox / 2, logoBox / 2 + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(lx + logoBox / 2, ly + logoBox / 2, logoBox / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, lx, ly, logoBox, logoBox);
      ctx.restore();
    } catch {
      /* ignore */
    }
  }

  // Business name (top-right below logo, small)
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  const bnSize = Math.round(W * 0.022);
  ctx.font = `700 ${bnSize}px ${FONT}`;
  ctx.fillText(
    params.businessName.toUpperCase().slice(0, 24),
    W - pad,
    pad + (params.businessLogoUrl ? logoBox + 8 : 0),
  );

  // Content zone
  const contentTop = heroH + Math.round(H * 0.02);
  const footerH = Math.round(H * (isTall ? 0.16 : 0.20));
  const contentBottom = H - footerH - pad;
  const contentH = contentBottom - contentTop;
  let cursorY = contentTop;
  const contentW = W - pad * 2;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // "Concorra a" label
  const labelSize = Math.round(W * 0.026);
  ctx.font = `700 ${labelSize}px ${FONT}`;
  ctx.fillStyle = theme.gold;
  ctx.fillText('🎁  CONCORRA A', pad, cursorY);
  cursorY += labelSize * 1.6;

  // Prize (biggest)
  const prizeMaxH = Math.round(contentH * 0.42);
  const prizeFit = fitLines(
    ctx, params.prize, contentW, prizeMaxH, isTall ? 3 : 2,
    Math.round(W * (isTall ? 0.10 : 0.085)), '900', FONT, 1.02,
  );
  ctx.font = `900 ${prizeFit.size}px ${FONT}`;
  ctx.fillStyle = '#FFFFFF';
  prizeFit.lines.forEach((l, i) => {
    ctx.fillText(l, pad, cursorY + i * prizeFit.size * 1.02);
  });
  cursorY += prizeFit.lines.length * prizeFit.size * 1.02 + Math.round(W * 0.02);

  // Title (subtitle line)
  if (params.title && params.title !== params.prize) {
    const titleFit = fitLines(
      ctx, params.title, contentW, Math.round(contentH * 0.14), 2,
      Math.round(W * 0.032), '600', FONT, 1.15,
    );
    ctx.font = `600 ${titleFit.size}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    titleFit.lines.forEach((l, i) => {
      ctx.fillText(l, pad, cursorY + i * titleFit.size * 1.15);
    });
    cursorY += titleFit.lines.length * titleFit.size * 1.15 + Math.round(W * 0.015);
  }

  // Info chips: entry cost + end date
  const chipSize = Math.round(W * 0.024);
  ctx.font = `700 ${chipSize}px ${FONT}`;
  const chipPadX = chipSize * 0.9;
  const chipPadY = chipSize * 0.55;
  const chipH = chipSize + chipPadY * 2;

  const entryLabel = params.entryCost > 0
    ? `🎟️  ${params.entryCost} pts / bilhete`
    : `🎟️  Participação gratuita`;
  const endDate = new Date(params.endDate);
  const dateStr = `📅  Até ${endDate.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })}`;

  const chips = [entryLabel, dateStr];
  let chipX = pad;
  chips.forEach((label) => {
    const twc = ctx.measureText(label).width;
    const cw = twc + chipPadX * 2;
    if (chipX + cw > W - pad) {
      chipX = pad;
      cursorY += chipH + Math.round(W * 0.012);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundedRect(ctx, chipX, cursorY, cw, chipH, chipH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = Math.max(1, W * 0.001);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, chipX + chipPadX, cursorY + chipH / 2);
    ctx.textBaseline = 'top';
    chipX += cw + Math.round(W * 0.015);
  });
  cursorY += chipH + Math.round(W * 0.025);

  // Description (optional, small)
  if (params.description) {
    const descFit = fitLines(
      ctx, params.description, contentW,
      Math.max(0, contentBottom - cursorY - Math.round(W * 0.02)),
      3, Math.round(W * 0.022), '400', FONT, 1.3,
    );
    ctx.font = `400 ${descFit.size}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    descFit.lines.forEach((l, i) => {
      ctx.fillText(l, pad, cursorY + i * descFit.size * 1.3);
    });
  }

  // FOOTER: QR + CTA + discreet Ofertivo watermark
  const qrSize = Math.round(footerH * 0.88);
  const qrX = pad;
  const qrY = H - pad - qrSize;
  try {
    const qrDataUrl = await QRCode.toDataURL(params.qrUrl, {
      width: qrSize, margin: 1,
      color: { dark: '#0B1220', light: '#FFFFFF' },
    });
    const qr = await loadImage(qrDataUrl);
    const cardPad = Math.round(qrSize * 0.08);
    ctx.fillStyle = '#FFFFFF';
    roundedRect(
      ctx, qrX - cardPad, qrY - cardPad,
      qrSize + cardPad * 2, qrSize + cardPad * 2,
      Math.round(qrSize * 0.1),
    );
    ctx.fill();
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } catch (e) {
    console.warn('qr failed', e);
  }

  // CTA text next to QR
  const ctaX = qrX + qrSize + Math.round(W * 0.035);
  const ctaSize = Math.round(W * 0.03);
  ctx.font = `900 ${ctaSize}px ${FONT}`;
  ctx.fillStyle = theme.gold;
  ctx.textBaseline = 'middle';
  ctx.fillText('ESCANEIE E PARTICIPE', ctaX, qrY + qrSize / 2 - ctaSize * 0.7);
  ctx.font = `500 ${Math.round(ctaSize * 0.75)}px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText('Aponte a câmera para o QR', ctaX, qrY + qrSize / 2 + ctaSize * 0.7);

  // Persona (canto inferior direito) — expande para preencher todo o espaço livre
  // à direita do texto/CTA, subindo até o topo do conteúdo (fim da hero).
  if (params.personaImageUrl) {
    try {
      const url = params.personaImageUrl;
      const cut: HTMLImageElement | HTMLCanvasElement | null = url ? await loadImage(url) : null;
      if (cut) {


        // Espaço livre à direita do CTA
        ctx.font = `900 ${ctaSize}px ${FONT}`;
        const ctaEndX = ctaX + Math.max(
          ctx.measureText('ESCANEIE E PARTICIPE').width,
          ctx.measureText('Aponte a câmera para o QR').width,
        );
        const availW = Math.max(0, (W - pad) - (ctaEndX + Math.round(W * 0.025)));
        const availH = Math.max(0, (H - pad) - contentTop);

        const minBoxW = Math.round(W * 0.30);
        const targetW = Math.max(availW, minBoxW);
        const targetH = availH;

        const scale = Math.max(0.6, Math.min(1.5, params.personaScale ?? 1));
        const r = Math.min(targetW / (cut as any).width, targetH / (cut as any).height) * scale;
        const dw = (cut as any).width * r;
        const dh = (cut as any).height * r;
        const mx = W - pad - dw;
        const my = H - pad - dh + Math.round(dh * 0.04);
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = Math.round(W * 0.02);
        ctx.shadowOffsetY = Math.round(W * 0.006);
        if (params.personaFlip) {
          ctx.translate(mx + dw / 2, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(cut as any, -dw / 2, my, dw, dh);
        } else {
          ctx.drawImage(cut as any, mx, my, dw, dh);
        }
        ctx.restore();
      }
    } catch (e) { console.warn('mascot failed', e); }
  }






  // Discreet Ofertivo watermark bottom-right
  const wmSize = Math.round(W * 0.018);
  ctx.font = `600 ${wmSize}px ${FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('powered by  •  OFERTIVO', W - pad, H - Math.round(pad * 0.4));

  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))),
      'image/png', 0.95,
    );
  });
}

export function canvasToPdfBlob(canvas: HTMLCanvasElement): Blob {
  const wMm = (canvas.width / 300) * 25.4;
  const hMm = (canvas.height / 300) * 25.4;
  const pdf = new jsPDF({
    orientation: hMm > wMm ? 'p' : 'l',
    unit: 'mm',
    format: [wMm, hMm],
    compress: true,
  });
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
