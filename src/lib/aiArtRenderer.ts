import QRCode from 'qrcode';
import jsPDF from 'jspdf';

export type ArtFormat = 'post' | 'story' | 'a4' | 'a3';
export type ArtStyle =
  | 'impacto_comercial'
  | 'sofisticado_premium'
  | 'popular_varejo'
  | 'minimalista_moderno'
  | 'jovem_vibrante'
  | 'luxo_elegante'
  | 'viral_redes';

export const FORMAT_DIMS: Record<ArtFormat, { w: number; h: number; label: string; print: boolean }> = {
  post: { w: 1080, h: 1080, label: 'Post 1080x1080', print: false },
  story: { w: 1080, h: 1920, label: 'Story 1080x1920', print: false },
  a4: { w: 2480, h: 3508, label: 'Cartaz A4 300dpi', print: true },
  a3: { w: 3508, h: 4961, label: 'Cartaz A3 300dpi', print: true },
};

export interface ArtBadge {
  label: string;
  emoji: string;
  color: string;
}

export interface ArtParams {
  format: ArtFormat;
  backgroundDataUrl: string;
  offerImageUrl?: string;
  headline: string;
  secondaryText?: string;
  cta?: string;
  trigger?: string;
  price?: number;
  originalPrice?: number;
  validUntil?: string;
  businessName: string;
  logoUrl?: string;
  qrUrl: string;
  primaryColor: string;
  secondaryColor: string;
  badge?: ArtBadge | null;
  typography?: 'display' | 'modern' | 'bold' | 'elegant' | 'casual';
  variation?: number;
}

const FONT_MAP: Record<string, string> = {
  display: '"Bebas Neue", "Impact", "Helvetica Neue", Arial, sans-serif',
  modern: '"Inter", "Helvetica Neue", Arial, sans-serif',
  bold: '"Inter", "Helvetica Neue Black", Arial Black, sans-serif',
  elegant: '"Playfair Display", "Georgia", serif',
  casual: '"Poppins", "Inter", sans-serif',
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[0], 16), g: parseInt(m[1], 16), b: parseInt(m[2], 16) };
}
function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function readableTextColor(bgHex: string) {
  return luminance(bgHex) > 0.55 ? '#0F172A' : '#FFFFFF';
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
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
  if (lines.length === maxLines) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 4) last = last.slice(0, -1);
    if (words.join(' ').length > lines.join(' ').length) lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxHeight: number,
  maxLines: number,
  startSize: number,
  weight: string,
  family: string,
  lineHeightRatio = 1.05,
): { size: number; lines: string[] } {
  let size = startSize;
  for (let i = 0; i < 30; i++) {
    ctx.font = `${weight} ${size}px ${family}`;
    const lines = wrapLines(ctx, text, maxWidth, maxLines);
    const totalH = lines.length * size * lineHeightRatio;
    if (totalH <= maxHeight && lines.length <= maxLines) {
      const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
      if (widest <= maxWidth) return { size, lines };
    }
    size = Math.floor(size * 0.92);
    if (size < 14) break;
  }
  ctx.font = `${weight} ${size}px ${family}`;
  return { size, lines: wrapLines(ctx, text, maxWidth, maxLines) };
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
}

export async function renderArt(params: ArtParams): Promise<HTMLCanvasElement> {
  const { format } = params;
  const dims = FORMAT_DIMS[format];
  const canvas = document.createElement('canvas');
  canvas.width = dims.w;
  canvas.height = dims.h;
  const ctx = canvas.getContext('2d')!;

  const isStory = format === 'story';
  const isPrint = dims.print;
  const isSquare = format === 'post';
  const FONT_FAMILY = FONT_MAP[params.typography || 'modern'];

  // 1. Fundo
  try {
    const bg = await loadImage(params.backgroundDataUrl);
    const ratio = Math.max(dims.w / bg.width, dims.h / bg.height);
    const bw = bg.width * ratio;
    const bh = bg.height * ratio;
    ctx.drawImage(bg, (dims.w - bw) / 2, (dims.h - bh) / 2, bw, bh);
  } catch {
    ctx.fillStyle = params.primaryColor;
    ctx.fillRect(0, 0, dims.w, dims.h);
  }

  const padding = Math.round(dims.w * (isPrint ? 0.07 : 0.06));
  const safeW = dims.w - padding * 2;
  const headerH = Math.round(dims.w * 0.16);
  const footerH = Math.round(dims.w * (isStory ? 0.16 : 0.18));
  const panelH = isStory ? Math.round(dims.h * 0.55) : isSquare ? Math.round(dims.h * 0.62) : Math.round(dims.h * 0.55);
  const panelY = dims.h - footerH - panelH - padding;

  // 1.5 — Foto da oferta como fundo completo, com overlay de gradiente para legibilidade
  if (params.offerImageUrl) {
    try {
      const offerImg = await loadImage(params.offerImageUrl);
      const variation = params.variation || 1;
      const { r: pr, g: pg, b: pb } = hexToRgb(params.primaryColor);

      // cobre toda a tela mantendo proporção (cover)
      const ratio = Math.max(dims.w / offerImg.width, dims.h / offerImg.height);
      const dw = offerImg.width * ratio;
      const dh = offerImg.height * ratio;
      const dx = (dims.w - dw) / 2;
      const dy = (dims.h - dh) / 2;

      ctx.save();
      // leve escurecimento global para dar profundidade
      ctx.globalAlpha = 0.92;
      ctx.drawImage(offerImg, dx, dy, dw, dh);
      ctx.restore();

      if (variation === 2) {
        // Variação 2: degradê radial — foco no centro, escurece nas bordas (estilo cinematográfico)
        const radial = ctx.createRadialGradient(
          dims.w / 2, dims.h * 0.42, dims.w * 0.15,
          dims.w / 2, dims.h * 0.5, Math.max(dims.w, dims.h) * 0.75
        );
        radial.addColorStop(0, 'rgba(0,0,0,0.05)');
        radial.addColorStop(0.55, 'rgba(0,0,0,0.45)');
        radial.addColorStop(1, `rgba(${Math.round(pr*0.3)},${Math.round(pg*0.3)},${Math.round(pb*0.3)},0.92)`);
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, dims.w, dims.h);
      } else {
        // Variação 1: degradê vertical — topo translúcido, base com cor da marca
        const overlay = ctx.createLinearGradient(0, 0, 0, dims.h);
        overlay.addColorStop(0, 'rgba(0,0,0,0.55)');
        overlay.addColorStop(0.35, 'rgba(0,0,0,0.25)');
        overlay.addColorStop(0.65, `rgba(${pr},${pg},${pb},0.45)`);
        overlay.addColorStop(1, `rgba(${pr},${pg},${pb},0.95)`);
        ctx.fillStyle = overlay;
        ctx.fillRect(0, 0, dims.w, dims.h);
      }
    } catch (e) {
      console.warn('offer image load failed', e);
    }
  }

  // Painel gradiente
  const { r, g, b } = hexToRgb(params.primaryColor);
  const grad = ctx.createLinearGradient(0, panelY - padding * 2, 0, panelY + panelH);
  grad.addColorStop(0, `rgba(${r},${g},${b},0)`);
  grad.addColorStop(0.25, `rgba(${r},${g},${b},0.80)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0.97)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, panelY - padding * 2, dims.w, panelH + footerH + padding * 3);

  // header overlay
  const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH + padding);
  headerGrad.addColorStop(0, `rgba(0,0,0,0.45)`);
  headerGrad.addColorStop(1, `rgba(0,0,0,0)`);
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, dims.w, headerH + padding);

  const accentColor = params.secondaryColor;

  // HEADER: badge selo (esquerda) + logo (direita)
  const logoSize = Math.round(headerH * 0.85);
  const logoX = dims.w - padding - logoSize;
  const logoY = padding;
  if (params.logoUrl) {
    try {
      const logo = await loadImage(params.logoUrl);
      ctx.fillStyle = 'rgba(255,255,255,0.98)';
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.arc(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } catch (e) {
      console.warn('logo load failed', e);
    }
  }

  // Nome do negócio
  const bizMaxW = params.logoUrl ? logoX - padding * 1.5 : safeW;
  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  const bizFit = fitFontSize(
    ctx,
    params.businessName.toUpperCase(),
    bizMaxW,
    Math.round(headerH * 0.5),
    1,
    Math.round(dims.w * 0.028),
    '800',
    FONT_FAMILY,
  );
  ctx.font = `800 ${bizFit.size}px ${FONT_FAMILY}`;
  ctx.fillText(bizFit.lines[0] || '', padding, padding + headerH * 0.35);

  // Selo de inteligência local (logo abaixo do nome do negócio)
  if (params.badge) {
    const sealSize = Math.round(dims.w * 0.020);
    ctx.font = `800 ${sealSize}px ${FONT_FAMILY}`;
    const sealLabel = `${params.badge.emoji}  ${params.badge.label}`;
    const sealW = ctx.measureText(sealLabel).width + sealSize * 2;
    const sealH = sealSize * 2.2;
    const sealX = padding;
    const sealY = padding + headerH * 0.65;
    ctx.fillStyle = params.badge.color;
    roundedRect(ctx, sealX, sealY, sealW, sealH, sealH / 2);
    ctx.fill();
    ctx.fillStyle = readableTextColor(params.badge.color);
    ctx.textBaseline = 'middle';
    ctx.fillText(sealLabel, sealX + sealSize, sealY + sealH / 2);
  }

  // CONTEÚDO
  const contentX = padding;
  const contentW = safeW;
  const contentTop = panelY;
  const contentBottom = dims.h - footerH - padding;

  ctx.textBaseline = 'top';

  // Trigger / chip
  const triggerLabel = (params.trigger || 'OFERTA EXCLUSIVA').toUpperCase();
  const chipFontSize = Math.round(dims.w * 0.022);
  ctx.font = `800 ${chipFontSize}px ${FONT_FAMILY}`;
  const chipPadX = chipFontSize * 0.9;
  const chipPadY = chipFontSize * 0.5;
  const chipTextW = ctx.measureText(triggerLabel).width;
  const chipW = chipTextW + chipPadX * 2;
  const chipH = chipFontSize + chipPadY * 2;
  let cursorY = contentTop + Math.round(dims.w * 0.02);
  ctx.fillStyle = accentColor;
  roundedRect(ctx, contentX, cursorY, chipW, chipH, chipH / 2);
  ctx.fill();
  ctx.fillStyle = readableTextColor(accentColor);
  ctx.fillText(triggerLabel, contentX + chipPadX, cursorY + chipPadY);
  cursorY += chipH + Math.round(dims.w * 0.025);

  const remainingH = contentBottom - cursorY;
  const ctaH = params.cta ? Math.round(dims.w * 0.085) : 0;
  const headlineMaxH = Math.round(remainingH * 0.42);
  const secondaryMaxH = params.secondaryText ? Math.round(remainingH * 0.13) : 0;
  const validityH = params.validUntil ? Math.round(remainingH * 0.07) : 0;
  const priceMaxH = remainingH - headlineMaxH - secondaryMaxH - validityH - ctaH - Math.round(dims.w * 0.08);

  // HEADLINE
  const headlineStart = Math.round(dims.w * (isStory ? 0.095 : 0.08));
  const headlineMaxLines = isStory ? 4 : 3;
  const headlineFit = fitFontSize(
    ctx, params.headline, contentW, headlineMaxH, headlineMaxLines,
    headlineStart, '900', FONT_FAMILY, 1.05,
  );
  ctx.font = `900 ${headlineFit.size}px ${FONT_FAMILY}`;
  ctx.fillStyle = '#FFFFFF';
  headlineFit.lines.forEach((line, i) => {
    ctx.fillText(line, contentX, cursorY + i * headlineFit.size * 1.05);
  });
  cursorY += headlineFit.lines.length * headlineFit.size * 1.05;

  // SECONDARY
  if (params.secondaryText) {
    cursorY += Math.round(dims.w * 0.012);
    const secStart = Math.round(headlineFit.size * 0.4);
    const secFit = fitFontSize(ctx, params.secondaryText, contentW, secondaryMaxH, 2, secStart, '500', FONT_FAMILY, 1.25);
    ctx.font = `500 ${secFit.size}px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    secFit.lines.forEach((line, i) => {
      ctx.fillText(line, contentX, cursorY + i * secFit.size * 1.25);
    });
    cursorY += secFit.lines.length * secFit.size * 1.25;
  }

  // PREÇO
  if (params.price !== undefined && params.price !== null) {
    cursorY += Math.round(dims.w * 0.025);
    ctx.fillStyle = accentColor;
    ctx.fillRect(contentX, cursorY, Math.round(dims.w * 0.08), Math.max(3, Math.round(dims.w * 0.005)));
    cursorY += Math.round(dims.w * 0.022);
    const labelSize = Math.round(dims.w * 0.022);
    ctx.font = `700 ${labelSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = accentColor;
    ctx.fillText('A PARTIR DE', contentX, cursorY);
    cursorY += labelSize * 1.4;
    const priceText = `R$ ${params.price.toFixed(2).replace('.', ',')}`;
    const oldText = params.originalPrice && params.originalPrice > params.price
      ? `R$ ${params.originalPrice.toFixed(2).replace('.', ',')}`
      : null;
    const priceMaxW = oldText ? contentW * 0.62 : contentW;
    const priceStart = Math.round(dims.w * (isStory ? 0.13 : 0.11));
    const priceFit = fitFontSize(
      ctx, priceText, priceMaxW, Math.max(priceMaxH, Math.round(dims.w * 0.12)), 1, priceStart, '900', FONT_FAMILY, 1,
    );
    ctx.font = `900 ${priceFit.size}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(priceText, contentX, cursorY);
    const priceWidth = ctx.measureText(priceText).width;
    if (oldText) {
      const oldSize = Math.round(priceFit.size * 0.32);
      ctx.font = `600 ${oldSize}px ${FONT_FAMILY}`;
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      const oldX = contentX + priceWidth + Math.round(dims.w * 0.025);
      const oldY = cursorY + priceFit.size - oldSize - Math.round(oldSize * 0.2);
      ctx.fillText(oldText, oldX, oldY);
      const oldW = ctx.measureText(oldText).width;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = Math.max(2, oldSize * 0.09);
      ctx.beginPath();
      ctx.moveTo(oldX, oldY + oldSize * 0.55);
      ctx.lineTo(oldX + oldW, oldY + oldSize * 0.55);
      ctx.stroke();
    }
    cursorY += priceFit.size * 1.05;
  }

  // VALIDADE
  if (params.validUntil) {
    cursorY += Math.round(dims.w * 0.015);
    const valSize = Math.round(dims.w * 0.022);
    ctx.font = `700 ${valSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    const date = new Date(params.validUntil);
    const fmt = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillText(`◷  Válido até ${fmt}`, contentX, cursorY);
    cursorY += valSize * 1.4;
  }

  // CTA pill
  if (params.cta) {
    cursorY += Math.round(dims.w * 0.018);
    const ctaText = params.cta.toUpperCase();
    const ctaFontSize = Math.round(dims.w * 0.034);
    ctx.font = `900 ${ctaFontSize}px ${FONT_FAMILY}`;
    const ctaPadX = ctaFontSize * 1.1;
    const ctaPadY = ctaFontSize * 0.6;
    const ctaTextW = ctx.measureText(ctaText).width;
    const ctaW = Math.min(contentW, ctaTextW + ctaPadX * 2);
    const ctaHReal = ctaFontSize + ctaPadY * 2;
    if (cursorY + ctaHReal <= contentBottom) {
      ctx.fillStyle = accentColor;
      roundedRect(ctx, contentX, cursorY, ctaW, ctaHReal, ctaHReal / 2);
      ctx.fill();
      ctx.fillStyle = readableTextColor(accentColor);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ctaText, contentX + ctaW / 2, cursorY + ctaHReal / 2);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
    }
  }

  // FOOTER QR
  const qrSize = Math.round(footerH * 0.95);
  const qrX = padding;
  const qrY = dims.h - padding - qrSize;
  try {
    const qrDataUrl = await QRCode.toDataURL(params.qrUrl, {
      width: qrSize, margin: 1, color: { dark: '#0F172A', light: '#FFFFFF' },
    });
    const qr = await loadImage(qrDataUrl);
    const qrCardPad = Math.round(qrSize * 0.08);
    const cardX = qrX - qrCardPad;
    const cardY = qrY - qrCardPad;
    const cardW = qrSize + qrCardPad * 2;
    const cardH = qrSize + qrCardPad * 2;
    ctx.fillStyle = '#FFFFFF';
    roundedRect(ctx, cardX, cardY, cardW, cardH, Math.round(cardH * 0.1));
    ctx.fill();
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
    const lblSize = Math.round(dims.w * 0.022);
    ctx.font = `700 ${lblSize}px ${FONT_FAMILY}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    const lblX = qrX + qrSize + qrCardPad * 3;
    const lblY = qrY + qrSize / 2;
    ctx.fillText('Escaneie e aproveite', lblX, lblY - lblSize * 0.7);
    ctx.font = `500 ${Math.round(lblSize * 0.85)}px ${FONT_FAMILY}`;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText('Veja a oferta no Ofertivo', lblX, lblY + lblSize * 0.7);
  } catch (e) {
    console.warn('qr failed', e);
  }

  return canvas;
}

export function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))), 'image/png', 0.95);
  });
}

export function canvasToPdfBlob(canvas: HTMLCanvasElement, format: ArtFormat): Blob {
  const wMm = (canvas.width / 300) * 25.4;
  const hMm = (canvas.height / 300) * 25.4;
  const pdf = new jsPDF({
    orientation: hMm > wMm ? 'p' : 'l',
    unit: 'mm',
    format: [wMm, hMm],
    compress: true,
  });
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  pdf.addImage(dataUrl, 'JPEG', 0, 0, wMm, hMm, undefined, 'FAST');
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
