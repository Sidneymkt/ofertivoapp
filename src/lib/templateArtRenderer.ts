// Sistema de geração de arte baseado em templates fixos (sem IA pesada).
// Renderização 100% no front-end via Canvas + exportação PNG/PDF.
// v2: layout em zonas (sem sobreposição), gradientes modernos, glass/blur, accents.

import QRCode from 'qrcode';
import jsPDF from 'jspdf';

export type TemplateFormat = 'post' | 'story' | 'a4' | 'a3';

export type TemplateKey =
  | 'moderno'
  | 'flash'
  | 'desconto'
  | 'elegante'
  | 'urgente'
  | 'comunidade'
  | 'gourmet'
  | 'tech'
  | 'pastel';

export const TEMPLATE_FORMATS: Record<TemplateFormat, { w: number; h: number; label: string }> = {
  post: { w: 1080, h: 1080, label: 'Post 1080×1080' },
  story: { w: 1080, h: 1920, label: 'Story 1080×1920' },
  a4: { w: 2480, h: 3508, label: 'Cartaz A4 300dpi' },
  a3: { w: 3508, h: 4961, label: 'Cartaz A3 300dpi' },
};

export interface TemplateMeta {
  key: TemplateKey;
  label: string;
  emoji: string;
  description: string;
  palette: { primary: string; secondary: string; accent: string; text: string };
  font: { display: string; body: string };
}

export const TEMPLATES: TemplateMeta[] = [
  {
    key: 'moderno',
    label: 'Moderno Minimalista',
    emoji: '⚪',
    description: 'Glass, espaço negativo, tipografia leve',
    palette: { primary: '#0F172A', secondary: '#FFFFFF', accent: '#3B82F6', text: '#0F172A' },
    font: { display: '"Inter", "Helvetica Neue", Arial, sans-serif', body: '"Inter", Arial, sans-serif' },
  },
  {
    key: 'flash',
    label: 'Flash Sale',
    emoji: '⚡',
    description: 'Amarelo neon, alto impacto',
    palette: { primary: '#FACC15', secondary: '#0A0A0A', accent: '#EF4444', text: '#0A0A0A' },
    font: { display: '"Bebas Neue", "Impact", Arial Black, sans-serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'desconto',
    label: 'Super Desconto',
    emoji: '🏷️',
    description: 'Vermelho gradiente, foco no preço',
    palette: { primary: '#DC2626', secondary: '#FFFFFF', accent: '#FACC15', text: '#FFFFFF' },
    font: { display: '"Bebas Neue", Impact, sans-serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'elegante',
    label: 'Elegante',
    emoji: '✨',
    description: 'Navy & dourado, premium',
    palette: { primary: '#0B1B3A', secondary: '#D4AF37', accent: '#FFFFFF', text: '#FFFFFF' },
    font: { display: '"Playfair Display", Georgia, serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'urgente',
    label: 'Promo Urgente',
    emoji: '🔥',
    description: 'Laranja/vermelho, gatilhos de urgência',
    palette: { primary: '#EA580C', secondary: '#0A0A0A', accent: '#FFFFFF', text: '#FFFFFF' },
    font: { display: '"Bebas Neue", Impact, sans-serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'comunidade',
    label: 'Comunidade',
    emoji: '🤝',
    description: 'Verde Ofertivo, institucional',
    palette: { primary: '#0D1520', secondary: '#10B981', accent: '#FACC15', text: '#FFFFFF' },
    font: { display: '"Poppins", "Inter", sans-serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'gourmet',
    label: 'Gourmet Editorial',
    emoji: '🍷',
    description: 'Magazine, serifa, terracota & creme',
    palette: { primary: '#1C1410', secondary: '#F5EBDD', accent: '#C2410C', text: '#F5EBDD' },
    font: { display: '"Playfair Display", Georgia, serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'tech',
    label: 'Tech Neon',
    emoji: '🛸',
    description: 'Cyberpunk, gradiente roxo/ciano',
    palette: { primary: '#0A0420', secondary: '#22D3EE', accent: '#A855F7', text: '#FFFFFF' },
    font: { display: '"Space Grotesk", "Inter", sans-serif', body: '"Inter", sans-serif' },
  },
  {
    key: 'pastel',
    label: 'Pastel Soft',
    emoji: '🌸',
    description: 'Tons pastéis, suave e moderno',
    palette: { primary: '#FFE4E6', secondary: '#0F172A', accent: '#F472B6', text: '#0F172A' },
    font: { display: '"Poppins", "Inter", sans-serif', body: '"Inter", sans-serif' },
  },
];

export interface TemplateRenderParams {
  template: TemplateKey;
  format: TemplateFormat;
  title: string;
  description?: string;
  price?: number;
  originalPrice?: number;
  validUntil?: string;
  imageUrl?: string;
  businessName: string;
  logoUrl?: string;
  qrUrl: string;
  cta?: string;
  trigger?: string;
}

// ---------- helpers ----------
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function fmtMoney(v?: number) {
  if (v == null || isNaN(v)) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtDate(d?: string) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return '';
  }
}

function calcDiscount(orig?: number, disc?: number): number | null {
  if (!orig || !disc || orig <= disc) return null;
  return Math.round(((orig - disc) / orig) * 100);
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines - 1) {
        // continue accumulating remaining words on last line for ellipsis logic
      }
    } else {
      line = test;
    }
    if (lines.length >= maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  // ellipsis on overflow
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (ctx.measureText(last).width > maxWidth) {
      let cut = last;
      while (cut.length && ctx.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1);
      lines[maxLines - 1] = cut.trimEnd() + '…';
    }
  }
  return lines;
}

function fitFontSize(ctx: CanvasRenderingContext2D, text: string, font: string, weight: string, maxWidth: number, startSize: number, minSize: number) {
  let size = startSize;
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${font}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= 4;
  }
  return minSize;
}

// fit by both width and total height (for wrapped lines)
function fitWrappedFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  weight: string,
  maxWidth: number,
  maxHeight: number,
  startSize: number,
  minSize: number,
  maxLines = 3,
  lineHeightMul = 1.05,
): { size: number; lines: string[] } {
  let size = startSize;
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px ${font}`;
    const lines = wrapText(ctx, text, maxWidth, maxLines);
    const totalH = lines.length * size * lineHeightMul;
    if (totalH <= maxHeight) return { size, lines };
    size -= 4;
  }
  ctx.font = `${weight} ${minSize}px ${font}`;
  return { size: minSize, lines: wrapText(ctx, text, maxWidth, maxLines) };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Glass panel — fundo translúcido com leve borda clara
function drawGlassPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, tint: 'light' | 'dark' = 'dark') {
  ctx.save();
  roundedRect(ctx, x, y, w, h, r);
  ctx.fillStyle = tint === 'dark' ? 'rgba(10,15,25,0.55)' : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = tint === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.45)';
  ctx.stroke();
  ctx.restore();
}

// Background com imagem + gradient overlay (transparência moderna)
function drawHeroBackground(
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number },
  img: HTMLImageElement | null,
  fallbackColor: string,
  overlayStops: Array<[number, string]>,
) {
  if (img) {
    drawCover(ctx, img, 0, 0, dims.w, dims.h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(0, 0, dims.w, dims.h);
  }
  const grad = ctx.createLinearGradient(0, 0, 0, dims.h);
  for (const [stop, color] of overlayStops) grad.addColorStop(stop, color);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dims.w, dims.h);
}

// ---------- main render ----------
export async function renderTemplateArt(params: TemplateRenderParams): Promise<HTMLCanvasElement> {
  const meta = TEMPLATES.find((t) => t.key === params.template) ?? TEMPLATES[0];
  const dims = TEMPLATE_FORMATS[params.format];
  const canvas = document.createElement('canvas');
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const [bgImg, logoImg, qrDataUrl] = await Promise.all([
    params.imageUrl ? loadImage(params.imageUrl).catch(() => null) : Promise.resolve(null),
    params.logoUrl ? loadImage(params.logoUrl).catch(() => null) : Promise.resolve(null),
    QRCode.toDataURL(params.qrUrl, { errorCorrectionLevel: 'M', margin: 0, width: 400 }),
  ]);
  const qrImg = await loadImage(qrDataUrl);

  const scale = dims.w / 1080;
  const padding = 64 * scale;

  ctx.fillStyle = meta.palette.primary;
  ctx.fillRect(0, 0, dims.w, dims.h);

  switch (meta.key) {
    case 'moderno': renderModerno(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'flash': renderFlash(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'desconto': renderDesconto(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'elegante': renderElegante(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'urgente': renderUrgente(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'comunidade': renderComunidade(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'gourmet': renderGourmet(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'tech': renderTech(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
    case 'pastel': renderPastel(ctx, dims, scale, padding, meta, params, bgImg, logoImg, qrImg); break;
  }

  return canvas;
}

// ---------- Footer reservado: retorna área (top do footer) ----------
const FOOTER_RATIO = 0.16; // 16% da altura reservada para footer (logo + nome + QR)

function getFooterTop(dims: { w: number; h: number }) {
  return dims.h - dims.h * FOOTER_RATIO;
}

function drawFooter(
  ctx: CanvasRenderingContext2D,
  dims: { w: number; h: number },
  scale: number,
  padding: number,
  textColor: string,
  businessName: string,
  logoImg: HTMLImageElement | null,
  qrImg: HTMLImageElement,
  bgTint: 'dark' | 'light' = 'dark',
) {
  const footerTop = getFooterTop(dims);
  const footerH = dims.h - footerTop;

  // faixa glass cobrindo footer inteiro
  ctx.save();
  ctx.fillStyle = bgTint === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.85)';
  ctx.fillRect(0, footerTop, dims.w, footerH);
  ctx.restore();

  const qrSize = Math.min(footerH * 0.68, 150 * scale);
  const qrPad = 12 * scale;
  const qrX = dims.w - padding - qrSize;
  const qrY = footerTop + (footerH - qrSize) / 2;

  // QR em container branco (memory: QR Code Visibility)
  ctx.fillStyle = '#FFFFFF';
  roundedRect(ctx, qrX - qrPad, qrY - qrPad, qrSize + qrPad * 2, qrSize + qrPad * 2, 14 * scale);
  ctx.fill();
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = textColor;
  ctx.font = `600 ${18 * scale}px "Inter", sans-serif`;
  ctx.textAlign = 'right';
  ctx.fillText('Escaneie e veja a oferta', qrX + qrSize, qrY - qrPad - 10 * scale);

  // logo + nome do negócio
  const logoSize = Math.min(footerH * 0.6, 80 * scale);
  const logoY = footerTop + (footerH - logoSize) / 2;
  let cursorX = padding;
  if (logoImg) {
    ctx.save();
    roundedRect(ctx, cursorX, logoY, logoSize, logoSize, 12 * scale);
    ctx.clip();
    ctx.drawImage(logoImg, cursorX, logoY, logoSize, logoSize);
    ctx.restore();
    cursorX += logoSize + 16 * scale;
  }
  ctx.fillStyle = textColor;
  ctx.textAlign = 'left';
  // limita largura disponível para o nome (até antes do bloco do QR)
  const nameMaxW = qrX - qrPad - cursorX - 24 * scale;
  const fontSize = fitFontSize(ctx, businessName, '"Inter", sans-serif', '700', nameMaxW, 28 * scale, 16 * scale);
  ctx.font = `700 ${fontSize}px "Inter", sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText(businessName, cursorX, footerTop + footerH / 2);
  ctx.textBaseline = 'alphabetic';
}

// ---------- TEMPLATE 1: MODERNO MINIMALISTA (glass) ----------
function renderModerno(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // imagem de fundo full + overlay vertical claro->escuro p/ contraste no texto
  drawHeroBackground(ctx, dims, img, '#F8FAFC', [
    [0, 'rgba(248,250,252,0.55)'],
    [0.45, 'rgba(248,250,252,0.78)'],
    [1, 'rgba(15,23,42,0.92)'],
  ]);

  // accent bar vertical à esquerda
  ctx.fillStyle = meta.palette.accent;
  ctx.fillRect(padding * 0.6, padding, 8 * scale, dims.h * 0.35);

  // tag superior glass
  const tagText = (p.trigger || 'OFERTA EXCLUSIVA').toUpperCase();
  ctx.font = `700 ${22 * scale}px ${meta.font.body}`;
  const tagW = ctx.measureText(tagText).width + 36 * scale;
  drawGlassPanel(ctx, padding, padding, tagW, 50 * scale, 25 * scale, 'light');
  ctx.fillStyle = meta.palette.primary;
  ctx.textBaseline = 'middle';
  ctx.fillText(tagText, padding + 18 * scale, padding + 25 * scale);
  ctx.textBaseline = 'alphabetic';

  // ZONA TÍTULO — entre 35% e 60% da altura
  const titleZoneY = dims.h * 0.30;
  const titleZoneH = dims.h * 0.30;
  const fitted = fitWrappedFontSize(ctx, p.title, meta.font.display, '800', dims.w - padding * 2, titleZoneH * 0.9, 96 * scale, 44 * scale, 3, 1.08);
  ctx.fillStyle = meta.palette.text;
  ctx.font = `800 ${fitted.size}px ${meta.font.display}`;
  ctx.textAlign = 'left';
  fitted.lines.forEach((l, i) => ctx.fillText(l, padding, titleZoneY + (i + 1) * fitted.size * 1.08));

  // ZONA PREÇO — bloco glass acima do footer
  const priceZoneTop = dims.h * 0.62;
  const priceZoneH = getFooterTop(dims) - priceZoneTop - padding * 0.4;
  if (p.price != null) {
    const blockW = dims.w * 0.66;
    drawGlassPanel(ctx, padding, priceZoneTop, blockW, priceZoneH, 24 * scale, 'dark');

    const innerX = padding + 30 * scale;
    let innerY = priceZoneTop + 36 * scale;
    if (p.originalPrice && p.originalPrice > p.price) {
      ctx.font = `500 ${28 * scale}px ${meta.font.body}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const orig = `De ${fmtMoney(p.originalPrice)}`;
      ctx.fillText(orig, innerX, innerY + 28 * scale);
      const w = ctx.measureText(orig).width;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo(innerX, innerY + 18 * scale);
      ctx.lineTo(innerX + w, innerY + 18 * scale);
      ctx.stroke();
      innerY += 40 * scale;
    }
    ctx.fillStyle = meta.palette.accent;
    const priceSize = fitFontSize(ctx, fmtMoney(p.price), meta.font.display, '900', blockW - 60 * scale, 110 * scale, 60 * scale);
    ctx.font = `900 ${priceSize}px ${meta.font.display}`;
    ctx.fillText(fmtMoney(p.price), innerX, innerY + priceSize);

    // CTA pill ao lado do preço (dentro do bloco se couber, senão abaixo)
    const ctaText = (p.cta || 'APROVEITE').toUpperCase();
    ctx.font = `800 ${22 * scale}px ${meta.font.body}`;
    const ctaW = ctx.measureText(ctaText).width + 40 * scale;
    const ctaH = 50 * scale;
    const ctaX = innerX;
    const ctaY = priceZoneTop + priceZoneH - ctaH - 24 * scale;
    ctx.fillStyle = meta.palette.accent;
    roundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, ctaX + 20 * scale, ctaY + ctaH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 2: FLASH SALE ----------
function renderFlash(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // gradiente amarelo neon
  const grad = ctx.createLinearGradient(0, 0, 0, dims.h);
  grad.addColorStop(0, '#FDE68A');
  grad.addColorStop(1, meta.palette.primary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // header preto com trigger
  const headerH = dims.h * 0.13;
  ctx.fillStyle = meta.palette.secondary;
  ctx.fillRect(0, 0, dims.w, headerH);
  ctx.fillStyle = meta.palette.primary;
  ctx.font = `900 ${52 * scale}px ${meta.font.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((p.trigger || '⚡ FLASH SALE ⚡').toUpperCase(), dims.w / 2, headerH / 2);
  ctx.textBaseline = 'alphabetic';

  // imagem central com moldura preta
  const imgZoneTop = headerH + padding * 0.6;
  const imgSize = Math.min(dims.w - padding * 2, dims.h * 0.36);
  const ix = (dims.w - imgSize) / 2;
  const iy = imgZoneTop;
  if (img) {
    ctx.save();
    ctx.fillStyle = meta.palette.secondary;
    roundedRect(ctx, ix - 10 * scale, iy - 10 * scale, imgSize + 20 * scale, imgSize + 20 * scale, 22 * scale);
    ctx.fill();
    ctx.save();
    roundedRect(ctx, ix, iy, imgSize, imgSize, 16 * scale);
    ctx.clip();
    drawCover(ctx, img, ix, iy, imgSize, imgSize);
    ctx.restore();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    roundedRect(ctx, ix, iy, imgSize, imgSize, 16 * scale);
    ctx.fill();
  }

  // badge desconto rotacionado, fora da imagem (canto superior direito)
  const disc = calcDiscount(p.originalPrice, p.price);
  if (disc) {
    ctx.save();
    ctx.translate(ix + imgSize - 30 * scale, iy + 30 * scale);
    ctx.rotate(0.18);
    ctx.fillStyle = meta.palette.accent;
    ctx.beginPath();
    ctx.arc(0, 0, 95 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${52 * scale}px ${meta.font.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`-${disc}%`, 0, 0);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  // ZONA TÍTULO — abaixo da imagem
  ctx.textAlign = 'center';
  const titleTop = iy + imgSize + 40 * scale;
  const priceH = p.price != null ? 130 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceH - 30 * scale;
  const fitted = fitWrappedFontSize(ctx, p.title.toUpperCase(), meta.font.display, '900', dims.w - padding * 2, titleMaxH, 110 * scale, 48 * scale, 2, 0.95);
  ctx.fillStyle = meta.palette.secondary;
  ctx.font = `900 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, dims.w / 2, titleTop + (i + 1) * fitted.size * 0.95));

  // preço grande logo acima do footer
  if (p.price != null) {
    ctx.fillStyle = meta.palette.accent;
    const priceSize = fitFontSize(ctx, fmtMoney(p.price), meta.font.display, '900', dims.w - padding * 2, 130 * scale, 70 * scale);
    ctx.font = `900 ${priceSize}px ${meta.font.display}`;
    ctx.fillText(fmtMoney(p.price), dims.w / 2, getFooterTop(dims) - 30 * scale);
  }

  ctx.textAlign = 'left';
  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 3: SUPER DESCONTO ----------
function renderDesconto(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // Imagem de fundo + degradê vermelho moderno
  drawHeroBackground(ctx, dims, img, '#7F1D1D', [
    [0, 'rgba(127,29,29,0.30)'],
    [0.45, 'rgba(153,27,27,0.65)'],
    [1, 'rgba(127,29,29,0.95)'],
  ]);

  // Faixa accent (amarela) à esquerda
  ctx.fillStyle = meta.palette.accent;
  ctx.fillRect(0, 0, 12 * scale, dims.h);

  // Mega desconto no topo direito (glass círculo)
  const disc = calcDiscount(p.originalPrice, p.price);
  if (disc) {
    const cx = dims.w - padding - 170 * scale;
    const cy = padding + 170 * scale;
    ctx.save();
    ctx.fillStyle = meta.palette.accent;
    ctx.beginPath();
    ctx.arc(cx, cy, 160 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = meta.palette.primary;
    ctx.font = `900 ${130 * scale}px ${meta.font.display}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${disc}%`, cx, cy - 20 * scale);
    ctx.font = `800 ${36 * scale}px ${meta.font.display}`;
    ctx.fillText('OFF', cx, cy + 60 * scale);
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }

  // ZONA TÍTULO — meio inferior
  const titleTop = dims.h * 0.55;
  const priceBlockH = p.price != null ? 200 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceBlockH - 30 * scale;
  ctx.textAlign = 'left';
  const fitted = fitWrappedFontSize(ctx, p.title, meta.font.display, '800', dims.w - padding * 2, titleMaxH, 78 * scale, 38 * scale, 2, 1.05);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, padding, titleTop + (i + 1) * fitted.size * 1.05));

  // Preço glass pill acima do footer
  if (p.price != null) {
    const label = fmtMoney(p.price);
    const labelPrefix = 'POR APENAS';
    ctx.font = `600 ${24 * scale}px ${meta.font.body}`;
    const prefixW = ctx.measureText(labelPrefix).width;
    ctx.font = `900 ${100 * scale}px ${meta.font.display}`;
    const labelW = ctx.measureText(label).width;
    const pillW = Math.max(prefixW, labelW) + 60 * scale;
    const pillH = 170 * scale;
    const px = padding;
    const py = getFooterTop(dims) - pillH - 24 * scale;
    drawGlassPanel(ctx, px, py, pillW, pillH, 24 * scale, 'dark');
    ctx.fillStyle = meta.palette.accent;
    ctx.font = `600 ${24 * scale}px ${meta.font.body}`;
    ctx.fillText(labelPrefix, px + 30 * scale, py + 50 * scale);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${100 * scale}px ${meta.font.display}`;
    ctx.fillText(label, px + 30 * scale, py + 140 * scale);
  }

  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 4: ELEGANTE ----------
function renderElegante(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // gradiente radial navy
  const radial = ctx.createRadialGradient(dims.w / 2, dims.h * 0.4, dims.w * 0.1, dims.w / 2, dims.h * 0.4, dims.w * 0.85);
  radial.addColorStop(0, '#1E3A8A');
  radial.addColorStop(1, meta.palette.primary);
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // moldura dourada interna
  ctx.strokeStyle = meta.palette.secondary;
  ctx.lineWidth = 3 * scale;
  ctx.strokeRect(padding * 0.6, padding * 0.6, dims.w - padding * 1.2, dims.h - padding * 1.2);

  // imagem em moldura central (zona superior)
  const imgZoneTop = padding * 1.6;
  const imgZoneBottom = dims.h * 0.5;
  const iw = dims.w - padding * 3;
  const ih = imgZoneBottom - imgZoneTop;
  const ix = (dims.w - iw) / 2;
  const iy = imgZoneTop;
  if (img) {
    ctx.save();
    ctx.fillStyle = meta.palette.secondary;
    roundedRect(ctx, ix - 6 * scale, iy - 6 * scale, iw + 12 * scale, ih + 12 * scale, 6 * scale);
    ctx.fill();
    ctx.save();
    roundedRect(ctx, ix, iy, iw, ih, 4 * scale);
    ctx.clip();
    drawCover(ctx, img, ix, iy, iw, ih);
    // overlay sutil para valorizar a tipografia abaixo
    const ovr = ctx.createLinearGradient(0, iy, 0, iy + ih);
    ovr.addColorStop(0, 'rgba(0,0,0,0)');
    ovr.addColorStop(1, 'rgba(11,27,58,0.55)');
    ctx.fillStyle = ovr;
    ctx.fillRect(ix, iy, iw, ih);
    ctx.restore();
    ctx.restore();
  }

  // separador dourado
  const sepY = imgZoneBottom + padding * 0.7;
  ctx.fillStyle = meta.palette.secondary;
  ctx.fillRect(dims.w / 2 - 70 * scale, sepY, 140 * scale, 2 * scale);

  // ZONA TÍTULO entre separador e zona preço
  const titleTop = sepY + 40 * scale;
  const priceBlockH = p.price != null ? 160 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceBlockH - 30 * scale;
  ctx.textAlign = 'center';
  const fitted = fitWrappedFontSize(ctx, p.title, meta.font.display, '700', dims.w - padding * 2.4, titleMaxH, 70 * scale, 36 * scale, 2, 1.12);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, dims.w / 2, titleTop + (i + 1) * fitted.size * 1.1));

  // Preço
  if (p.price != null) {
    const py = getFooterTop(dims) - priceBlockH;
    ctx.fillStyle = meta.palette.secondary;
    ctx.font = `400 ${26 * scale}px ${meta.font.body}`;
    ctx.fillText('a partir de', dims.w / 2, py + 36 * scale);
    const priceSize = fitFontSize(ctx, fmtMoney(p.price), meta.font.display, '700', dims.w - padding * 2, 90 * scale, 50 * scale);
    ctx.font = `700 ${priceSize}px ${meta.font.display}`;
    ctx.fillText(fmtMoney(p.price), dims.w / 2, py + 36 * scale + priceSize + 14 * scale);
  }

  ctx.textAlign = 'left';
  drawFooter(ctx, dims, scale, padding, meta.palette.secondary, p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 5: PROMO URGENTE ----------
function renderUrgente(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // Imagem de fundo full + gradient overlay laranja → vermelho
  drawHeroBackground(ctx, dims, img, meta.palette.primary, [
    [0, 'rgba(234,88,12,0.55)'],
    [0.5, 'rgba(220,38,38,0.65)'],
    [1, 'rgba(127,29,29,0.95)'],
  ]);

  // listras decorativas no topo
  ctx.save();
  for (let i = 0; i < dims.w; i += 60 * scale) {
    ctx.fillStyle = (i / (60 * scale)) % 2 === 0 ? meta.palette.secondary : meta.palette.accent;
    ctx.fillRect(i, 0, 60 * scale, 24 * scale);
  }
  ctx.restore();

  // trigger
  const triggerText = (p.trigger || `🔥 SÓ ATÉ ${fmtDate(p.validUntil) || 'HOJE'}`).toUpperCase();
  ctx.font = `900 ${48 * scale}px ${meta.font.display}`;
  ctx.fillStyle = meta.palette.accent;
  ctx.textAlign = 'center';
  ctx.fillText(triggerText, dims.w / 2, 24 * scale + 70 * scale);

  // ZONA TÍTULO — meio
  const titleTop = dims.h * 0.42;
  const priceH = p.price != null ? 170 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceH - 30 * scale;
  const fitted = fitWrappedFontSize(ctx, p.title.toUpperCase(), meta.font.display, '900', dims.w - padding * 2, titleMaxH, 100 * scale, 46 * scale, 2, 0.98);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `900 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, dims.w / 2, titleTop + (i + 1) * fitted.size * 0.98));

  // Preço pill amarelo
  if (p.price != null) {
    const label = fmtMoney(p.price);
    ctx.font = `900 ${110 * scale}px ${meta.font.display}`;
    const labelW = ctx.measureText(label).width + 70 * scale;
    const pillH = 140 * scale;
    const px = (dims.w - labelW) / 2;
    const py = getFooterTop(dims) - pillH - 24 * scale;
    ctx.fillStyle = meta.palette.accent;
    roundedRect(ctx, px, py, labelW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = meta.palette.primary;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, dims.w / 2, py + pillH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.textAlign = 'left';
  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 6: COMUNIDADE ----------
function renderComunidade(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // gradiente navy → verde sutil
  const grad = ctx.createLinearGradient(0, 0, dims.w, dims.h);
  grad.addColorStop(0, meta.palette.primary);
  grad.addColorStop(1, '#064E3B');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // header verde com ondulação
  const headerH = 130 * scale;
  ctx.fillStyle = meta.palette.secondary;
  ctx.fillRect(0, 0, dims.w, headerH);
  // wave abaixo do header
  ctx.fillStyle = meta.palette.secondary;
  ctx.beginPath();
  ctx.moveTo(0, headerH);
  ctx.bezierCurveTo(dims.w * 0.25, headerH + 60 * scale, dims.w * 0.75, headerH - 60 * scale, dims.w, headerH);
  ctx.lineTo(dims.w, headerH);
  ctx.lineTo(0, headerH);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${38 * scale}px ${meta.font.display}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🤝 OFERTA DA COMUNIDADE', dims.w / 2, headerH / 2);
  ctx.textBaseline = 'alphabetic';

  // imagem
  const imgTop = headerH + padding * 0.8;
  const imgH = dims.h * 0.34;
  const iw = dims.w - padding * 2;
  if (img) {
    ctx.save();
    roundedRect(ctx, padding, imgTop, iw, imgH, 18 * scale);
    ctx.clip();
    drawCover(ctx, img, padding, imgTop, iw, imgH);
    // overlay leve
    const ovr = ctx.createLinearGradient(0, imgTop, 0, imgTop + imgH);
    ovr.addColorStop(0, 'rgba(0,0,0,0)');
    ovr.addColorStop(1, 'rgba(13,21,32,0.45)');
    ctx.fillStyle = ovr;
    ctx.fillRect(padding, imgTop, iw, imgH);
    ctx.restore();
  }

  // ZONA TÍTULO
  const titleTop = imgTop + imgH + 30 * scale;
  const priceH = p.price != null ? 110 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceH - 30 * scale;
  ctx.textAlign = 'center';
  const fitted = fitWrappedFontSize(ctx, p.title, meta.font.display, '700', dims.w - padding * 2, titleMaxH, 60 * scale, 32 * scale, 2, 1.1);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `700 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, dims.w / 2, titleTop + (i + 1) * fitted.size * 1.08));

  // Preço pill
  if (p.price != null) {
    const label = `Por apenas ${fmtMoney(p.price)}`;
    ctx.font = `800 ${40 * scale}px ${meta.font.display}`;
    const w = ctx.measureText(label).width + padding * 1.2;
    const h = 90 * scale;
    const x = (dims.w - w) / 2;
    const y = getFooterTop(dims) - h - 24 * scale;
    ctx.fillStyle = meta.palette.accent;
    roundedRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = meta.palette.primary;
    ctx.textBaseline = 'middle';
    ctx.fillText(label, dims.w / 2, y + h / 2);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.textAlign = 'left';
  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 7: GOURMET EDITORIAL ----------
function renderGourmet(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // base creme com vinheta marrom escura
  drawHeroBackground(ctx, dims, null, meta.palette.secondary, [
    [0, 'rgba(245,235,221,0)'],
    [1, 'rgba(28,20,16,0.18)'],
  ]);

  // Imagem editorial à direita (metade vertical)
  const imgX = dims.w * 0.42;
  const imgY = padding;
  const imgW = dims.w - imgX - padding;
  const imgH = getFooterTop(dims) - padding * 1.6;
  if (img) {
    ctx.save();
    roundedRect(ctx, imgX, imgY, imgW, imgH, 8 * scale);
    ctx.clip();
    drawCover(ctx, img, imgX, imgY, imgW, imgH);
    const ovr = ctx.createLinearGradient(imgX, imgY, imgX, imgY + imgH);
    ovr.addColorStop(0, 'rgba(28,20,16,0.10)');
    ovr.addColorStop(1, 'rgba(28,20,16,0.55)');
    ctx.fillStyle = ovr;
    ctx.fillRect(imgX, imgY, imgW, imgH);
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(28,20,16,0.10)';
    roundedRect(ctx, imgX, imgY, imgW, imgH, 8 * scale);
    ctx.fill();
  }

  // Coluna de texto à esquerda
  const colX = padding;
  const colW = imgX - padding * 1.5;

  // tag editorial
  const tag = (p.trigger || 'EDIÇÃO ESPECIAL').toUpperCase();
  ctx.font = `700 ${20 * scale}px ${meta.font.body}`;
  ctx.fillStyle = meta.palette.accent;
  ctx.textAlign = 'left';
  ctx.fillText(tag, colX, padding + 28 * scale);
  // linha sob tag
  ctx.fillStyle = meta.palette.accent;
  ctx.fillRect(colX, padding + 42 * scale, 80 * scale, 3 * scale);

  // ZONA TÍTULO — coluna esquerda, serifa
  const titleTop = padding + 90 * scale;
  const priceBlockH = p.price != null ? 180 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceBlockH - 40 * scale;
  const fitted = fitWrappedFontSize(ctx, p.title, meta.font.display, '700', colW, titleMaxH, 92 * scale, 38 * scale, 4, 1.08);
  ctx.fillStyle = meta.palette.primary;
  ctx.font = `700 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, colX, titleTop + (i + 1) * fitted.size * 1.06));

  // Preço editorial
  if (p.price != null) {
    const py = getFooterTop(dims) - priceBlockH;
    ctx.fillStyle = meta.palette.primary;
    ctx.font = `400 italic ${24 * scale}px ${meta.font.display}`;
    ctx.fillText('a partir de', colX, py + 32 * scale);
    const priceSize = fitFontSize(ctx, fmtMoney(p.price), meta.font.display, '900', colW, 90 * scale, 50 * scale);
    ctx.fillStyle = meta.palette.accent;
    ctx.font = `900 ${priceSize}px ${meta.font.display}`;
    ctx.fillText(fmtMoney(p.price), colX, py + 32 * scale + priceSize + 8 * scale);

    // CTA discreta sublinhada
    const ctaText = (p.cta || 'Reserve já').toUpperCase();
    ctx.font = `800 ${20 * scale}px ${meta.font.body}`;
    ctx.fillStyle = meta.palette.primary;
    const ctaY = py + priceBlockH - 14 * scale;
    ctx.fillText(ctaText, colX, ctaY);
    const cw = ctx.measureText(ctaText).width;
    ctx.fillRect(colX, ctaY + 6 * scale, cw, 2 * scale);
  }

  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 8: TECH NEON ----------
function renderTech(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // gradiente diagonal roxo → azul profundo
  const grad = ctx.createLinearGradient(0, 0, dims.w, dims.h);
  grad.addColorStop(0, '#1E0A40');
  grad.addColorStop(0.5, '#3B0764');
  grad.addColorStop(1, meta.palette.primary);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // grid sutil de pontos
  ctx.fillStyle = 'rgba(168,85,247,0.18)';
  const step = 40 * scale;
  for (let x = step; x < dims.w; x += step) {
    for (let y = step; y < dims.h; y += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Halo neon
  const radial = ctx.createRadialGradient(dims.w * 0.7, dims.h * 0.25, 10, dims.w * 0.7, dims.h * 0.25, dims.w * 0.55);
  radial.addColorStop(0, 'rgba(34,211,238,0.45)');
  radial.addColorStop(1, 'rgba(34,211,238,0)');
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // imagem em card com borda neon
  const cardX = padding;
  const cardY = dims.h * 0.10;
  const cardW = dims.w - padding * 2;
  const cardH = dims.h * 0.32;
  if (img) {
    ctx.save();
    roundedRect(ctx, cardX, cardY, cardW, cardH, 26 * scale);
    ctx.clip();
    drawCover(ctx, img, cardX, cardY, cardW, cardH);
    const ovr = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
    ovr.addColorStop(0, 'rgba(10,4,32,0.10)');
    ovr.addColorStop(1, 'rgba(10,4,32,0.65)');
    ctx.fillStyle = ovr;
    ctx.fillRect(cardX, cardY, cardW, cardH);
    ctx.restore();
  } else {
    drawGlassPanel(ctx, cardX, cardY, cardW, cardH, 26 * scale, 'dark');
  }
  // borda neon
  ctx.save();
  ctx.strokeStyle = meta.palette.secondary;
  ctx.lineWidth = 3 * scale;
  ctx.shadowColor = meta.palette.secondary;
  ctx.shadowBlur = 24 * scale;
  roundedRect(ctx, cardX, cardY, cardW, cardH, 26 * scale);
  ctx.stroke();
  ctx.restore();

  // tag neon
  const tag = (p.trigger || '// PROMO TECH').toUpperCase();
  ctx.font = `700 ${22 * scale}px ${meta.font.body}`;
  const tagW = ctx.measureText(tag).width + 32 * scale;
  ctx.save();
  ctx.fillStyle = 'rgba(34,211,238,0.18)';
  roundedRect(ctx, padding, padding * 0.5, tagW, 44 * scale, 22 * scale);
  ctx.fill();
  ctx.strokeStyle = meta.palette.secondary;
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();
  ctx.fillStyle = meta.palette.secondary;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, padding + 16 * scale, padding * 0.5 + 22 * scale);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();

  // ZONA TÍTULO
  const titleTop = cardY + cardH + 30 * scale;
  const priceH = p.price != null ? 160 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceH - 30 * scale;
  ctx.textAlign = 'left';
  const fitted = fitWrappedFontSize(ctx, p.title.toUpperCase(), meta.font.display, '800', dims.w - padding * 2, titleMaxH, 84 * scale, 40 * scale, 3, 1.0);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, padding, titleTop + (i + 1) * fitted.size * 1.0));

  // Preço com gradient text simulado (accent + secondary)
  if (p.price != null) {
    const label = fmtMoney(p.price);
    const py = getFooterTop(dims) - priceH;
    ctx.font = `600 ${22 * scale}px ${meta.font.body}`;
    ctx.fillStyle = meta.palette.secondary;
    ctx.fillText('A PARTIR DE', padding, py + 28 * scale);
    const priceSize = fitFontSize(ctx, label, meta.font.display, '900', dims.w - padding * 2 - 220 * scale, 100 * scale, 56 * scale);
    const tg = ctx.createLinearGradient(padding, 0, padding + 600 * scale, 0);
    tg.addColorStop(0, meta.palette.secondary);
    tg.addColorStop(1, meta.palette.accent);
    ctx.fillStyle = tg;
    ctx.font = `900 ${priceSize}px ${meta.font.display}`;
    ctx.fillText(label, padding, py + 28 * scale + priceSize + 8 * scale);

    // CTA pill com glow
    const ctaText = (p.cta || 'GARANTIR').toUpperCase();
    ctx.font = `800 ${22 * scale}px ${meta.font.body}`;
    const ctaW = ctx.measureText(ctaText).width + 44 * scale;
    const ctaH = 56 * scale;
    const ctaX = dims.w - padding - ctaW;
    const ctaY = py + priceH - ctaH - 8 * scale;
    ctx.save();
    ctx.shadowColor = meta.palette.accent;
    ctx.shadowBlur = 28 * scale;
    ctx.fillStyle = meta.palette.accent;
    roundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, ctaX + 22 * scale, ctaY + ctaH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  drawFooter(ctx, dims, scale, padding, '#FFFFFF', p.businessName, logo, qr, 'dark');
}

// ---------- TEMPLATE 9: PASTEL SOFT ----------
function renderPastel(
  ctx: CanvasRenderingContext2D, dims: { w: number; h: number }, scale: number, padding: number,
  meta: TemplateMeta, p: TemplateRenderParams, img: HTMLImageElement | null, logo: HTMLImageElement | null, qr: HTMLImageElement,
) {
  // gradiente pastel rosa → lavanda
  const grad = ctx.createLinearGradient(0, 0, dims.w, dims.h);
  grad.addColorStop(0, '#FFE4E6');
  grad.addColorStop(0.5, '#FCE7F3');
  grad.addColorStop(1, '#E0E7FF');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, dims.w, dims.h);

  // blobs decorativos
  const blob = (cx: number, cy: number, r: number, color: string) => {
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  };
  blob(dims.w * 0.85, dims.h * 0.15, dims.w * 0.4, 'rgba(244,114,182,0.45)');
  blob(dims.w * 0.1, dims.h * 0.55, dims.w * 0.45, 'rgba(167,139,250,0.35)');

  // Imagem em círculo no topo
  const imgD = Math.min(dims.w * 0.5, dims.h * 0.30);
  const ix = (dims.w - imgD) / 2;
  const iy = padding * 1.4;
  if (img) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ix + imgD / 2, iy + imgD / 2, imgD / 2, 0, Math.PI * 2);
    ctx.clip();
    drawCover(ctx, img, ix, iy, imgD, imgD);
    ctx.restore();
    // anel
    ctx.save();
    ctx.strokeStyle = meta.palette.accent;
    ctx.lineWidth = 6 * scale;
    ctx.beginPath();
    ctx.arc(ix + imgD / 2, iy + imgD / 2, imgD / 2 + 8 * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.arc(ix + imgD / 2, iy + imgD / 2, imgD / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // tag pill
  const tag = (p.trigger || '✨ NOVIDADE').toUpperCase();
  ctx.font = `700 ${22 * scale}px ${meta.font.body}`;
  const tagW = ctx.measureText(tag).width + 36 * scale;
  const tagX = (dims.w - tagW) / 2;
  const tagY = iy + imgD + 24 * scale;
  ctx.fillStyle = meta.palette.accent;
  roundedRect(ctx, tagX, tagY, tagW, 46 * scale, 23 * scale);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(tag, dims.w / 2, tagY + 23 * scale);
  ctx.textBaseline = 'alphabetic';

  // ZONA TÍTULO
  const titleTop = tagY + 70 * scale;
  const priceH = p.price != null ? 180 * scale : 0;
  const titleMaxH = getFooterTop(dims) - titleTop - priceH - 30 * scale;
  const fitted = fitWrappedFontSize(ctx, p.title, meta.font.display, '800', dims.w - padding * 2, titleMaxH, 76 * scale, 36 * scale, 3, 1.08);
  ctx.fillStyle = meta.palette.secondary;
  ctx.font = `800 ${fitted.size}px ${meta.font.display}`;
  fitted.lines.forEach((l, i) => ctx.fillText(l, dims.w / 2, titleTop + (i + 1) * fitted.size * 1.06));

  // Preço card branco com sombra suave
  if (p.price != null) {
    const cardW = dims.w * 0.78;
    const cardH = priceH - 20 * scale;
    const cx = (dims.w - cardW) / 2;
    const cy = getFooterTop(dims) - cardH - 20 * scale;
    ctx.save();
    ctx.shadowColor = 'rgba(244,114,182,0.35)';
    ctx.shadowBlur = 30 * scale;
    ctx.shadowOffsetY = 8 * scale;
    ctx.fillStyle = '#FFFFFF';
    roundedRect(ctx, cx, cy, cardW, cardH, 28 * scale);
    ctx.fill();
    ctx.restore();

    let innerY = cy + 28 * scale;
    if (p.originalPrice && p.originalPrice > p.price) {
      ctx.font = `500 ${24 * scale}px ${meta.font.body}`;
      ctx.fillStyle = '#94A3B8';
      const orig = `De ${fmtMoney(p.originalPrice)}`;
      ctx.fillText(orig, dims.w / 2, innerY + 22 * scale);
      const w = ctx.measureText(orig).width;
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.moveTo((dims.w - w) / 2, innerY + 14 * scale);
      ctx.lineTo((dims.w + w) / 2, innerY + 14 * scale);
      ctx.stroke();
      innerY += 32 * scale;
    }
    ctx.fillStyle = meta.palette.accent;
    const priceSize = fitFontSize(ctx, fmtMoney(p.price), meta.font.display, '900', cardW - 60 * scale, 90 * scale, 50 * scale);
    ctx.font = `900 ${priceSize}px ${meta.font.display}`;
    ctx.fillText(fmtMoney(p.price), dims.w / 2, innerY + priceSize);

    // CTA pill abaixo
    const ctaText = (p.cta || 'QUERO').toUpperCase();
    ctx.font = `800 ${20 * scale}px ${meta.font.body}`;
    const ctaW = ctx.measureText(ctaText).width + 40 * scale;
    const ctaH = 46 * scale;
    const ctaX = (dims.w - ctaW) / 2;
    const ctaY = cy + cardH - ctaH - 18 * scale;
    ctx.fillStyle = meta.palette.secondary;
    roundedRect(ctx, ctaX, ctaY, ctaW, ctaH, ctaH / 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(ctaText, dims.w / 2, ctaY + ctaH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  ctx.textAlign = 'left';
  drawFooter(ctx, dims, scale, padding, meta.palette.secondary, p.businessName, logo, qr, 'light');
}

// ---------- export utils ----------
export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png', 0.95);
  });
}

export function canvasToPdfBlob(canvas: HTMLCanvasElement, format: TemplateFormat): Blob {
  const isPrint = format === 'a4' || format === 'a3';
  const pageSize = format === 'a4' ? 'a4' : format === 'a3' ? 'a3' : [canvas.width, canvas.height];
  const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({
    orientation,
    unit: isPrint ? 'mm' : 'px',
    format: pageSize as any,
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, pageH, undefined, 'FAST');
  return pdf.output('blob');
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
