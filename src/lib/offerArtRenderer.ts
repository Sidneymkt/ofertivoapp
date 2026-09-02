import QRCode from 'qrcode';
import jsPDF from 'jspdf';

export type OfferArtFormat = 'post' | 'story' | 'a4' | 'a3';

export const OFFER_ART_FORMATS: {
  key: OfferArtFormat;
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

export type OfferArtTheme = 'dark' | 'gold' | 'vibrant' | 'sunset' | 'ocean' | 'emerald' | 'neon' | 'coral' | 'midnight' | 'mono';

const THEMES: Record<OfferArtTheme, { bg1: string; bg2: string; accent: string; gold: string; price: string }> = {
  dark:     { bg1: '#0B1220', bg2: '#0D1520', accent: '#3B82F6', gold: '#F5B301', price: '#22c55e' },
  gold:     { bg1: '#1a0f00', bg2: '#3a2600', accent: '#F5B301', gold: '#FFD54A', price: '#22c55e' },
  vibrant:  { bg1: '#5b21b6', bg2: '#1e3a8a', accent: '#22c55e', gold: '#F5B301', price: '#4ade80' },
  sunset:   { bg1: '#6c1e1e', bg2: '#c2410c', accent: '#fb923c', gold: '#fde047', price: '#fef3c7' },
  ocean:    { bg1: '#0c2340', bg2: '#0d4a6e', accent: '#22d3ee', gold: '#67e8f9', price: '#7dd3fc' },
  emerald:  { bg1: '#064e3b', bg2: '#065f46', accent: '#10b981', gold: '#fbbf24', price: '#a7f3d0' },
  neon:     { bg1: '#0a0a0a', bg2: '#1a0033', accent: '#ec4899', gold: '#a3e635', price: '#22d3ee' },
  coral:    { bg1: '#7f1d1d', bg2: '#ec4899', accent: '#fb7185', gold: '#fde68a', price: '#fef3c7' },
  midnight: { bg1: '#020617', bg2: '#1e1b4b', accent: '#818cf8', gold: '#e0e7ff', price: '#a78bfa' },
  mono:     { bg1: '#0a0a0a', bg2: '#262626', accent: '#f5f5f5', gold: '#fafafa', price: '#e5e5e5' },

};

const FONT = '"Inter", "Helvetica Neue", Arial, sans-serif';

export interface OfferArtParams {
  format: OfferArtFormat;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number | null;
  validUntil?: string;
  imageUrl?: string;
  businessName: string;
  businessLogoUrl?: string;
  qrUrl: string;
  cta?: string;
  theme?: OfferArtTheme;
  personaImageUrl?: string;
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

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + rr, rr);
  ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  ctx.arcTo(x, y + h, x, y + h - rr, rr);
  ctx.arcTo(x, y, x + rr, y, rr);
  ctx.closePath();
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
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    let last = lines[maxLines - 1];
    while (ctx.measureText(last + '…').width > maxWidth && last.length > 4) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function fitLines(
  ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxHeight: number,
  maxLines: number, startSize: number, weight: string, family: string, lh = 1.1,
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

// Remove near-white background from a mascot image (for AI-generated mascots).
function keyOutWhite(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const cx = c.getContext('2d')!;
  cx.drawImage(img, 0, 0);
  try {
    const id = cx.getImageData(0, 0, c.width, c.height);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      if (r > 240 && g > 240 && b > 240) d[i + 3] = 0;
      else if (r > 220 && g > 220 && b > 220) d[i + 3] = 90;
    }
    cx.putImageData(id, 0, 0);
  } catch {}
  return c;
}

export async function renderOfferArt(params: OfferArtParams): Promise<HTMLCanvasElement> {
  const fmt = OFFER_ART_FORMATS.find((f) => f.key === params.format)!;
  const W = fmt.w;
  const H = fmt.h;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const theme = THEMES[params.theme || 'dark'];
  const isTall = H > W;

  // Base background
  const baseGrad = ctx.createLinearGradient(0, 0, W, H);
  baseGrad.addColorStop(0, theme.bg1);
  baseGrad.addColorStop(1, theme.bg2);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, W, H);

  // Hero (offer image with cover) — ocupa metade superior
  const heroH = Math.round(H * (isTall ? 0.44 : 0.40));
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
    } catch { /* keep base bg */ }
  } else {
    ctx.fillStyle = theme.accent + '22';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, heroH * 0.6);
    ctx.lineTo(0, heroH);
    ctx.closePath();
    ctx.fill();
  }

  // Fade suave da hero para o BG
  const fade = ctx.createLinearGradient(0, heroH - Math.round(H * 0.18), 0, heroH + Math.round(H * 0.04));
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(1, theme.bg2);
  ctx.fillStyle = fade;
  ctx.fillRect(0, heroH - Math.round(H * 0.18), W, Math.round(H * 0.22));

  const pad = Math.round(W * 0.06);

  // Badge topo esquerdo: OFERTA / desconto
  const discount = params.originalPrice && params.originalPrice > params.price
    ? Math.round(((params.originalPrice - params.price) / params.originalPrice) * 100) : 0;
  const badgeText = discount > 0 ? `-${discount}% OFF` : 'OFERTA';
  const badgeSize = Math.round(W * 0.032);
  ctx.font = `900 ${badgeSize}px ${FONT}`;
  const tw = ctx.measureText(badgeText).width;
  const bpx = badgeSize * 1.0;
  const bpy = badgeSize * 0.5;
  ctx.fillStyle = discount > 0 ? '#ef4444' : theme.gold;
  roundedRect(ctx, pad, pad, tw + bpx * 2, badgeSize + bpy * 2, (badgeSize + bpy * 2) / 2);
  ctx.fill();
  ctx.fillStyle = discount > 0 ? '#FFFFFF' : '#0B1220';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(badgeText, pad + bpx, pad + (badgeSize + bpy * 2) / 2);

  // Logo do negócio (topo direito)
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
    } catch { /* ignore */ }
  }
  // Nome do negócio (topo direito abaixo do logo)
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

  // Zona de conteúdo — o rodapé (QR + CTA) pode encolher para liberar espaço ao texto,
  // garantindo que nenhum elemento sobreponha o outro em qualquer formato.
  const contentTop = heroH + Math.round(H * 0.012);
  const footerBase = Math.round(H * (isTall ? 0.16 : 0.20));
  const footerMin = Math.round(footerBase * 0.68);
  let footerH = footerBase;
  let contentBottom = H - footerH - pad;
  const contentH = contentBottom - contentTop;
  let cursorY = contentTop;
  const contentW = W - pad * 2;


  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Título
  const titleFit = fitLines(
    ctx, params.title, contentW, Math.round(contentH * 0.40), isTall ? 3 : 2,
    Math.round(W * (isTall ? 0.075 : 0.065)), '900', FONT, 1.05,
  );
  ctx.font = `900 ${titleFit.size}px ${FONT}`;
  ctx.fillStyle = '#FFFFFF';
  titleFit.lines.forEach((l, i) => ctx.fillText(l, pad, cursorY + i * titleFit.size * 1.05));
  cursorY += titleFit.lines.length * titleFit.size * 1.05 + Math.round(W * 0.02);

  // Preço (destaque)
  const priceText = `R$ ${params.price.toFixed(2).replace('.', ',')}`;
  const priceSize = Math.round(W * (isTall ? 0.10 : 0.085));
  ctx.font = `900 ${priceSize}px ${FONT}`;
  ctx.fillStyle = theme.price;
  ctx.textBaseline = 'top';
  ctx.fillText(priceText, pad, cursorY);
  const priceW = ctx.measureText(priceText).width;

  if (params.originalPrice && params.originalPrice > params.price) {
    const origSize = Math.round(priceSize * 0.42);
    ctx.font = `600 ${origSize}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    const orig = `R$ ${params.originalPrice.toFixed(2).replace('.', ',')}`;
    const ox = pad + priceW + Math.round(W * 0.02);
    const oy = cursorY + priceSize * 0.35;
    ctx.fillText(orig, ox, oy);
    const ow = ctx.measureText(orig).width;
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = Math.max(2, W * 0.0025);
    ctx.beginPath();
    ctx.moveTo(ox, oy + origSize * 0.55);
    ctx.lineTo(ox + ow, oy + origSize * 0.55);
    ctx.stroke();
  }
  const priceRowBottom = cursorY + priceSize;
  cursorY += priceSize * 1.1 + Math.round(W * 0.015);

  // Chip de validade (opcional) — posicionado à direita do preço no formato quadrado
  // para não empurrar o layout e sobrepor o QR/CTA do rodapé.
  if (params.validUntil) {
    try {
      const dt = new Date(params.validUntil);
      const dateStr = `⏰  Válido até ${dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      const chipSize = Math.round(W * 0.024);
      ctx.font = `700 ${chipSize}px ${FONT}`;
      const chipPadX = chipSize * 0.9;
      const chipPadY = chipSize * 0.55;
      const chipH = chipSize + chipPadY * 2;
      const twc = ctx.measureText(dateStr).width;
      const cw = twc + chipPadX * 2;

      // Decide posição: à direita do preço (se couber) OU abaixo (se sobrar espaço vertical)
      const rightX = W - pad - cw;
      const priceEndX = pad + priceW + (params.originalPrice && params.originalPrice > params.price
        ? Math.round(W * 0.02) + ctx.measureText(`R$ ${(params.originalPrice).toFixed(2).replace('.', ',')}`).width + Math.round(W * 0.02)
        : Math.round(W * 0.03));
      const fitsRight = rightX >= priceEndX;
      const spaceBelow = contentBottom - cursorY;
      const useRight = !isTall && fitsRight;
      const chipX = useRight ? rightX : pad;
      const chipY = useRight
        ? priceRowBottom - chipH - Math.round(priceSize * 0.05)
        : cursorY;

      // Se não couber nem à direita nem abaixo, não renderiza para evitar sobreposição.
      if (useRight || spaceBelow >= chipH + Math.round(W * 0.01)) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        roundedRect(ctx, chipX, chipY, cw, chipH, chipH / 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = Math.max(1, W * 0.001);
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';
        ctx.fillText(dateStr, chipX + chipPadX, chipY + chipH / 2);
        ctx.textBaseline = 'top';
        if (!useRight) cursorY += chipH + Math.round(W * 0.02);
      }
    } catch {}
  }

  // Reserva lateral para persona em formatos quadrados/landscape, evitando que texto e chips
  // ocupem a mesma área visual quando houver uma pessoa na composição.
  const hasPersona = Boolean(params.personaImageUrl);
  const personaReservedW = hasPersona ? Math.round(W * (isTall ? 0.24 : 0.30)) : 0;
  const textSafeW = hasPersona ? Math.max(Math.round(W * 0.48), contentW - personaReservedW) : contentW;

  // Descrição (opcional) — fonte maior e auto-ajustável. Se faltar espaço, o rodapé
  // (QR + CTA) encolhe até o limite mínimo para acomodar o texto sem sobreposição.
  let descFit: { size: number; lines: string[] } | null = null;
  if (params.description) {
    const descMax = Math.round(W * (isTall ? 0.045 : 0.040));
    const descMin = Math.round(W * (isTall ? 0.032 : 0.029));
    const maxLines = isTall ? 5 : 4;
    const measure = () => fitLines(
      ctx, params.description!, textSafeW,
      Math.max(0, contentBottom - cursorY - Math.round(W * 0.02)),
      maxLines, descMax, '500', FONT, 1.28,
    );
    descFit = measure();
    // Encolhe o rodapé progressivamente enquanto a descrição ficar pequena demais.
    while (descFit.size < descMin && footerH > footerMin) {
      footerH = Math.max(footerMin, Math.round(footerH * 0.92));
      contentBottom = H - footerH - pad;
      descFit = measure();
    }
    ctx.font = `500 ${descFit.size}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    descFit.lines.forEach((l, i) => ctx.fillText(l, pad, cursorY + i * descFit!.size * 1.3));
  }

  // FOOTER: QR + CTA (QR se adapta ao rodapé final e ao espaço restante)
  const qrSize = Math.round(footerH * 0.88);
  const qrX = pad;
  const qrY = H - pad - qrSize;
  try {
    const qrDataUrl = await QRCode.toDataURL(params.qrUrl, {
      width: Math.max(180, qrSize), margin: 1, color: { dark: '#0B1220', light: '#FFFFFF' },
    });
    const qr = await loadImage(qrDataUrl);
    const cardPad = Math.round(qrSize * 0.08);
    ctx.fillStyle = '#FFFFFF';
    roundedRect(ctx, qrX - cardPad, qrY - cardPad, qrSize + cardPad * 2, qrSize + cardPad * 2, Math.round(qrSize * 0.1));
    ctx.fill();
    ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);
  } catch (e) { console.warn('qr failed', e); }

  const ctaX = qrX + qrSize + Math.round(W * 0.035);
  const ctaText = (params.cta || 'APROVEITE AGORA').toUpperCase();
  const ctaSubText = 'Escaneie o QR e veja a oferta';
  // Largura livre para o CTA: nunca invade a área reservada da persona.
  const ctaMaxW = Math.max(Math.round(W * 0.2), (W - pad - (hasPersona ? personaReservedW : 0)) - ctaX);
  let ctaSize = Math.round(W * 0.032);
  ctx.font = `900 ${ctaSize}px ${FONT}`;
  while (ctx.measureText(ctaText).width > ctaMaxW && ctaSize > Math.round(W * 0.018)) {
    ctaSize = Math.floor(ctaSize * 0.94);
    ctx.font = `900 ${ctaSize}px ${FONT}`;
  }
  ctx.fillStyle = theme.gold;
  ctx.textBaseline = 'middle';
  ctx.fillText(ctaText, ctaX, qrY + qrSize / 2 - ctaSize * 0.7);
  let subSize = Math.round(ctaSize * 0.75);
  ctx.font = `500 ${subSize}px ${FONT}`;
  while (ctx.measureText(ctaSubText).width > ctaMaxW && subSize > Math.round(W * 0.014)) {
    subSize = Math.floor(subSize * 0.94);
    ctx.font = `500 ${subSize}px ${FONT}`;
  }
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.fillText(ctaSubText, ctaX, qrY + qrSize / 2 + ctaSize * 0.7);


  // Persona (bottom-right) — ocupa somente a área segura à direita/rodapé,
  // sem invadir QR, CTA, preço, validade ou descrição. Preserva aspect ratio.
  if (params.personaImageUrl) {
    try {
      const url = params.personaImageUrl;
      const cut: HTMLImageElement | HTMLCanvasElement | null = url ? await loadImage(url) : null;
      if (cut) {


        // Espaço horizontal livre: da direita do CTA até a borda direita.
        const ctaEndX = ctaX + Math.max(
          ctx.measureText((params.cta || 'APROVEITE AGORA').toUpperCase()).width,
          ctx.measureText('Escaneie o QR e veja a oferta').width,
        );
        const footerSafeLeft = ctaEndX + Math.round(W * 0.035);
        const contentSafeLeft = pad + textSafeW + Math.round(W * 0.035);
        const safeLeft = Math.min(Math.max(footerSafeLeft, contentSafeLeft), W - pad - Math.round(W * 0.12));
        const availW = Math.max(Math.round(W * 0.12), (W - pad) - safeLeft);

        // Espaço vertical seguro: começa abaixo da linha de preço/validade e termina antes
        // da marca d'água. Isso evita a sobreposição vista em ofertas com validade curta.
        const personaTopLimit = Math.max(
          contentTop + Math.round(W * 0.035),
          priceRowBottom + Math.round(W * 0.035),
        );
        const personaBottom = H - Math.round(pad * 0.78);
        const availH = Math.max(Math.round(H * 0.16), personaBottom - personaTopLimit);

        // Mantém presença visual, mas sem forçar largura maior que a área livre.
        const targetW = Math.min(availW, Math.round(W * (isTall ? 0.38 : 0.30)));
        const targetH = availH;

        const scale = Math.max(0.6, Math.min(1.5, params.personaScale ?? 1));
        const r = Math.min(targetW / (cut as any).width, targetH / (cut as any).height) * scale;
        const dw = (cut as any).width * r;
        const dh = (cut as any).height * r;
        const mx = Math.min(Math.max(safeLeft, W - pad - dw), W - pad - dw);
        const my = Math.max(personaTopLimit, personaBottom - dh);
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


  // Marca Ofertivo discreta
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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar PNG'))), 'image/png', 0.95);
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
