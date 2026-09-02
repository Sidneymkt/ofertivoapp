// Helpers para artes 100% geradas por IA (sem composição em canvas).
import { jsPDF } from 'jspdf';

export type AiOfferFormat = 'post' | 'story' | 'a4' | 'a3';

export const AI_OFFER_FORMATS: {
  key: AiOfferFormat; label: string; icon: string; w: number; h: number;
}[] = [
  { key: 'post', label: 'Post 1080×1080', icon: '🟦', w: 1024, h: 1024 },
  { key: 'story', label: 'Story 1024×1536', icon: '📱', w: 1024, h: 1536 },
  { key: 'a4', label: 'Cartaz A4 (retrato)', icon: '📄', w: 1024, h: 1536 },
  { key: 'a3', label: 'Cartaz A3 (retrato)', icon: '📰', w: 1024, h: 1536 },
];

export function base64ToPngBlob(b64: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: 'image/png' });
}

export async function base64ToPdfBlob(b64: string): Promise<Blob> {
  // Descobre dimensões reais da imagem
  const url = `data:image/png;base64,${b64}`;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });
  const wMm = (img.width / 300) * 25.4;
  const hMm = (img.height / 300) * 25.4;
  const pdf = new jsPDF({
    orientation: hMm > wMm ? 'p' : 'l',
    unit: 'mm',
    format: [wMm, hMm],
    compress: true,
  });
  pdf.addImage(url, 'PNG', 0, 0, wMm, hMm, undefined, 'FAST');
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

/**
 * Composita o QR Code da oferta (canto inferior direito) sobre a imagem gerada pela IA.
 * Retorna novo base64 PNG.
 */
export async function compositeQrOnBase64(
  baseB64: string,
  qrDataUrl: string,
  opts?: { label?: string }
): Promise<string> {
  const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    // Sem crossOrigin: usamos apenas data URLs, e definir crossOrigin pode
    // fazer alguns browsers rejeitarem/tainted em certas versões.
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Falha ao carregar imagem para composição do QR'));
    i.src = src;
  });

  const base = await loadImg(`data:image/png;base64,${baseB64}`);
  const qr = await loadImg(qrDataUrl);

  const canvas = document.createElement('canvas');
  canvas.width = base.width;
  canvas.height = base.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(base, 0, 0);

  const side = Math.min(base.width, base.height);
  const qrSize = Math.round(side * 0.26);
  const pad = Math.round(side * 0.028);
  const labelH = Math.round(qrSize * 0.20);
  const boxW = qrSize + pad * 2;
  const boxH = qrSize + pad * 2 + labelH;
  const x = base.width - boxW - pad;
  const y = base.height - boxH - pad;

  const radius = Math.round(qrSize * 0.09);
  // Sombra + placa branca
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.round(side * 0.025);
  ctx.shadowOffsetY = Math.round(side * 0.006);
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, boxW, boxH, radius);
  ctx.fill();
  ctx.restore();

  // Borda dourada para destacar
  ctx.save();
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = Math.max(2, Math.round(side * 0.004));
  roundRect(ctx, x, y, boxW, boxH, radius);
  ctx.stroke();
  ctx.restore();

  ctx.drawImage(qr, x + pad, y + pad, qrSize, qrSize);

  const label = opts?.label || 'Escaneie e faça check-in';
  ctx.fillStyle = '#0D1520';
  ctx.font = `700 ${Math.round(labelH * 0.55)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + boxW / 2, y + pad + qrSize + labelH / 2, boxW - pad);

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.split(',')[1];

}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
