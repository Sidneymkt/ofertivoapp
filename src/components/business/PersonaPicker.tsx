import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Loader2, RotateCcw, Trash2, Upload, UserRound, X, Check, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  loadUploadedPersona, uploadPersonaForBusiness, clearUploadedPersona, preparePersonaFile,
  getUploadedPersona,
} from '@/lib/aiArtPersonas';

export interface PersonaState {
  mode: 'upload';
  presetKey: string;
  customText: string;
  uploadedUrl: string | null;
  /** Imagem aprovada — usada diretamente na arte. */
  previewDataUrl: string | null;
  options: Record<string, string>;
  refreshKey: number;
  /** Tamanho da persona na arte (0.6 – 1.5). */
  scale: number;
  /** Espelhar a persona horizontalmente. */
  flip: boolean;
}

export const createPersonaState = (_category?: string | null): PersonaState => ({
  mode: 'upload',
  presetKey: '',
  customText: '',
  uploadedUrl: null,
  previewDataUrl: null,
  options: {},
  refreshKey: 0,
  scale: 1,
  flip: false,
});

/** Apenas a foto enviada pelo anunciante é usada na arte (sem IA). */
export function resolvePersona(
  state: PersonaState,
  _ctx: { businessName?: string; category?: string },
): { personaImageUrl?: string; personaScale?: number; personaFlip?: boolean } {
  const adjust = { personaScale: state.scale ?? 1, personaFlip: !!state.flip };
  const url = state.previewDataUrl || state.uploadedUrl;
  if (!url) return {};
  return { personaImageUrl: url, ...adjust };
}

interface Props {
  businessId: string;
  category?: string | null;
  value: PersonaState;
  onChange: (next: PersonaState) => void;
}

export const PersonaPicker: React.FC<Props> = ({ businessId, value, onChange }) => {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropPreview, setCropPreview] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetY, setOffsetY] = useState(0);
  const [removeBg, setRemoveBg] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (p: Partial<PersonaState>) => onChange({ ...value, ...p });

  useEffect(() => {
    if (!businessId) return;
    const cached = getUploadedPersona(businessId);
    if (cached) patch({ uploadedUrl: cached });
    loadUploadedPersona(businessId).then((url) => {
      if (url) onChange({ ...value, uploadedUrl: url });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const buildCrop = useCallback(async (file: File, z: number, oy: number, rb: boolean) => {
    const { dataUrl } = await preparePersonaFile(file, { zoom: z, offsetY: oy, removeBackground: rb });
    setCropPreview(dataUrl);
  }, []);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (file.type !== 'image/png') { toast.error('Envie um arquivo PNG'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Imagem muito grande (máx 10MB)'); return; }
    setPendingFile(file);
    setZoom(1); setOffsetY(0);
    await buildCrop(file, 1, 0, removeBg);
  };

  useEffect(() => {
    if (!pendingFile) return;
    const t = setTimeout(() => buildCrop(pendingFile, zoom, offsetY, removeBg), 200);
    return () => clearTimeout(t);
  }, [zoom, offsetY, removeBg, pendingFile, buildCrop]);

  const confirmUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const { file, dataUrl } = await preparePersonaFile(pendingFile, { zoom, offsetY, removeBackground: removeBg });
      const url = await uploadPersonaForBusiness(businessId, file);
      onChange({
        ...value,
        uploadedUrl: url,
        previewDataUrl: dataUrl,
        mode: 'upload',
        refreshKey: value.refreshKey + 1,
      });
      setPendingFile(null); setCropPreview(null);
      toast.success('Persona aplicada na arte!');
    } catch (e: any) {
      toast.error('Falha ao salvar persona: ' + (e?.message || 'erro'));
    } finally {
      setUploading(false);
    }
  };

  const removeUpload = async () => {
    try { await clearUploadedPersona(businessId); } catch {}
    onChange({ ...value, uploadedUrl: null, previewDataUrl: null, refreshKey: value.refreshKey + 1 });
    toast.success('Persona removida');
  };

  const hasPersona = Boolean(value.previewDataUrl || value.uploadedUrl);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5">
          <UserRound className="h-4 w-4 text-primary" /> Persona da Oferta
        </Label>
        <Button
          type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1"
          onClick={() => patch({ refreshKey: value.refreshKey + 1 })}
          title="Atualizar persona na arte"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </Button>
      </div>
      <p className="text-xs text-muted-foreground -mt-1">
        Envie a foto (PNG) de uma pessoa real para compor a arte. Opcional.
      </p>

      {hasPersona && !pendingFile && (
        <div className="relative rounded-lg border border-border p-2 flex items-center gap-3">
          <img
            src={value.previewDataUrl || value.uploadedUrl || ''}
            alt="Persona enviada"
            className="h-16 w-16 object-contain rounded-md bg-muted/40"
          />
          <div className="text-xs flex-1">
            <div className="font-medium flex items-center gap-1"><Check className="h-3.5 w-3.5 text-primary" /> Persona atual</div>
            <div className="text-muted-foreground">Usada em todas as artes desta oferta.</div>
          </div>
          <Button variant="ghost" size="sm" onClick={removeUpload} title="Remover">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!pendingFile && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0] || null); }}
          onClick={() => inputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition ${
            dragOver ? 'border-primary bg-primary/10' : 'border-primary/30 hover:bg-primary/5'
          }`}
        >
          <Upload className="h-5 w-5 mx-auto mb-1 text-primary" />
          <div className="text-xs font-medium">Arraste e solte a foto aqui</div>
          <div className="text-[10px] text-muted-foreground">
            Foto de pessoa real · somente PNG · até 10MB
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,.png"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
        </div>
      )}

      {pendingFile && (
        <div className="relative rounded-lg border border-border bg-background p-3 space-y-3 overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-medium">Ajuste o enquadramento</div>
            <Button
              variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0"
              onClick={() => { setPendingFile(null); setCropPreview(null); }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-center bg-muted/40 rounded-md p-2 h-40 overflow-hidden">
            {cropPreview
              ? <img src={cropPreview} alt="Prévia da persona" className="max-h-full max-w-full object-contain" />
              : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          <div className="space-y-1 px-1">
            <Label className="text-[11px] text-muted-foreground">Zoom</Label>
            <Slider value={[zoom]} min={0.6} max={2.5} step={0.05} onValueChange={(v) => setZoom(v[0])} />
          </div>
          <div className="space-y-1 px-1">
            <Label className="text-[11px] text-muted-foreground">Posição vertical</Label>
            <Slider value={[offsetY]} min={-0.6} max={0.6} step={0.05} onValueChange={(v) => setOffsetY(v[0])} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-[11px] leading-tight">Remover fundo automaticamente</Label>
            <Switch checked={removeBg} onCheckedChange={setRemoveBg} />
          </div>
          <Button className="w-full" onClick={confirmUpload} disabled={uploading}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            Salvar e aplicar na arte
          </Button>
        </div>
      )}

      {/* Ajuste da persona na arte: tamanho e espelhamento */}
      {hasPersona && (
        <div className="rounded-lg border border-border p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Ajuste na arte
            </div>
            <Button
              type="button"
              size="sm"
              variant={value.flip ? 'default' : 'outline'}
              className="h-7 gap-1 text-xs"
              onClick={() => patch({ flip: !value.flip, refreshKey: value.refreshKey + 1 })}
              title="Inverter (espelhar) a imagem"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {value.flip ? 'Invertida' : 'Inverter'}
            </Button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Tamanho</span>
              <span className="tabular-nums">{Math.round((value.scale ?? 1) * 100)}%</span>
            </div>
            <Slider
              value={[Math.round((value.scale ?? 1) * 100)]}
              min={60}
              max={150}
              step={5}
              onValueChange={(v) => patch({ scale: (v[0] ?? 100) / 100 })}
              onValueCommit={() => patch({ refreshKey: value.refreshKey + 1 })}
            />
            <p className="text-[10px] text-muted-foreground">
              O limite evita sobreposição com preço, CTA e QR Code.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaPicker;
