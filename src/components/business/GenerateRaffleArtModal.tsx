import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Loader2, Download, FileImage, FileText, Sparkles, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  RAFFLE_FORMATS, RaffleFormat,
  renderRaffleArt, canvasToPngBlob, canvasToPdfBlob, downloadBlob,
} from '@/lib/raffleArtRenderer';
import PersonaPicker, { PersonaState, createPersonaState, resolvePersona } from '@/components/business/PersonaPicker';


interface RaffleLite {
  id: string;
  title: string;
  description?: string | null;
  prize: string;
  entry_cost: number;
  end_date: string;
  image_url?: string | null;
  offer_id?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  raffle: RaffleLite | null;
  businessId: string;
  businessName: string;
}

type RaffleTheme = 'dark' | 'gold' | 'vibrant' | 'sunset' | 'ocean' | 'emerald' | 'neon' | 'coral' | 'midnight' | 'mono';
const THEMES: { key: RaffleTheme; label: string; swatch: [string, string, string] }[] = [
  { key: 'dark',     label: 'Noturno',    swatch: ['#0B1220', '#3B82F6', '#F5B301'] },
  { key: 'gold',     label: 'Dourado',    swatch: ['#1a0f00', '#3a2600', '#FFD54A'] },
  { key: 'vibrant',  label: 'Vibrante',   swatch: ['#5b21b6', '#1e3a8a', '#22c55e'] },
  { key: 'sunset',   label: 'Pôr do Sol', swatch: ['#6c1e1e', '#c2410c', '#fde047'] },
  { key: 'ocean',    label: 'Oceano',     swatch: ['#0c2340', '#0d4a6e', '#22d3ee'] },
  { key: 'emerald',  label: 'Esmeralda',  swatch: ['#064e3b', '#065f46', '#fbbf24'] },
  { key: 'neon',     label: 'Neon',       swatch: ['#0a0a0a', '#1a0033', '#ec4899'] },
  { key: 'coral',    label: 'Coral',      swatch: ['#7f1d1d', '#ec4899', '#fde68a'] },
  { key: 'midnight', label: 'Meia-noite', swatch: ['#020617', '#1e1b4b', '#818cf8'] },
  { key: 'mono',     label: 'Mono',       swatch: ['#0a0a0a', '#262626', '#fafafa'] },
];

export const GenerateRaffleArtModal: React.FC<Props> = ({
  isOpen, onClose, raffle, businessId, businessName,
}) => {
  const [format, setFormat] = useState<RaffleFormat>('post');
  const [theme, setTheme] = useState<RaffleTheme>('dark');
  const [prize, setPrize] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [persona, setPersona] = useState<PersonaState>(() => createPersonaState(null));



  useEffect(() => {
    if (!isOpen || !raffle) return;
    setPrize(raffle.prize || '');
    setTitle(raffle.title || '');
    setDescription(raffle.description || '');
    setImageUrl(raffle.image_url || undefined);
    (async () => {
      const { data: biz } = await supabase
        .from('businesses')
        .select('logo_url')
        .eq('id', businessId)
        .maybeSingle();
      setLogoUrl(biz?.logo_url || undefined);

      // If linked to offer, try to use offer image as fallback
      if (!raffle.image_url && raffle.offer_id) {
        const { data: off } = await supabase
          .from('offers')
          .select('image_url')
          .eq('id', raffle.offer_id)
          .maybeSingle();
        if (off?.image_url) setImageUrl(off.image_url);
      }
    })();
  }, [isOpen, raffle?.id, businessId]);

  useEffect(() => {
    if (!isOpen || !raffle) return;
    const t = setTimeout(async () => {
      try {
        const c = await renderRaffleArt({
          format,
          theme,
          title,
          prize,
          description,
          entryCost: raffle.entry_cost,
          endDate: raffle.end_date,
          imageUrl,
          businessName,
          businessLogoUrl: logoUrl,
          qrUrl: `${window.location.origin}/sorteios/${raffle.id}`,
          ...resolvePersona(persona, { businessName }),

        });
        const blob = await canvasToPngBlob(c);
        setCanvas(c);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
      } catch (e) {
        console.error('raffle preview failed', e);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, raffle?.id, format, theme, title, prize, description, imageUrl, logoUrl, persona]);

  const download = async (asPdf: boolean) => {
    if (!canvas || !raffle) return;
    setGenerating(true);
    try {
      const blob = asPdf ? canvasToPdfBlob(canvas) : await canvasToPngBlob(canvas);
      downloadBlob(
        blob,
        `sorteio-${raffle.id}-${format}.${asPdf ? 'pdf' : 'png'}`,
      );
      toast.success(`Arte ${asPdf ? 'PDF' : 'PNG'} baixada!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao baixar arte');
    } finally {
      setGenerating(false);
    }
  };

  if (!raffle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Arte do Sorteio
          </DialogTitle>
          <DialogDescription>
            Gere uma arte profissional do seu sorteio. Escolha formato para redes sociais ou cartaz impresso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4">
          {/* Preview */}
          <div className="bg-muted/40 rounded-lg p-3 flex items-center justify-center min-h-[400px]">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Prévia da arte"
                className="max-h-[70vh] max-w-full object-contain rounded-md shadow-lg"
              />
            ) : (
              <div className="text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Gerando prévia...
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            <div>
              <Label>Formato</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {RAFFLE_FORMATS.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFormat(f.key)}
                    className={`p-2 rounded-md border text-xs text-left transition ${
                      format === f.key
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="font-semibold">{f.label}</div>
                    <div className="text-muted-foreground">
                      {f.print ? 'Impressão 300dpi' : 'Redes sociais'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label>Estilo visual</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
                {THEMES.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTheme(t.key)}
                    className={`p-1.5 rounded-lg border text-[10px] font-medium transition-all ${
                      theme === t.key
                        ? 'border-primary ring-2 ring-primary/40 shadow-md scale-[1.02]'
                        : 'border-border hover:border-primary/40 hover:shadow-sm'
                    }`}
                    title={t.label}
                  >
                    <div className="flex h-6 w-full rounded overflow-hidden mb-1 shadow-inner">
                      {t.swatch.map((c, i) => (
                        <div key={i} className="flex-1" style={{ background: c }} />
                      ))}
                    </div>
                    <div className="truncate">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>


            <div>
              <Label>Prêmio</Label>
              <Input value={prize} onChange={(e) => setPrize(e.target.value)} />
            </div>
            <div>
              <Label>Título do sorteio</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div>
              <Label>URL da imagem (opcional)</Label>
              <Input
                value={imageUrl || ''}
                onChange={(e) => setImageUrl(e.target.value || undefined)}
                placeholder="Cole uma URL ou deixe vazio para usar fundo estilizado"
              />
            </div>

            <PersonaPicker
              businessId={businessId}
              category={undefined}
              value={persona}
              onChange={setPersona}
            />





            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={() => download(false)}
                disabled={!canvas || generating}
                className="w-full"
              >
                {generating
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  : <FileImage className="h-4 w-4 mr-1" />}
                PNG
              </Button>
              <Button
                onClick={() => download(true)}
                disabled={!canvas || generating}
                variant="outline"
                className="w-full"
              >
                {generating
                  ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  : <FileText className="h-4 w-4 mr-1" />}
                PDF
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateRaffleArtModal;
