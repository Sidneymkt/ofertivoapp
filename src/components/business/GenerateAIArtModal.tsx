import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, Download, FileImage, FileText, Sparkles, Heart, Star, Upload, Trash2, X, Wand2, Lock, Search, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  OFFER_ART_FORMATS, OfferArtFormat, OfferArtTheme,
  renderOfferArt, canvasToPngBlob, canvasToPdfBlob, downloadBlob,
} from '@/lib/offerArtRenderer';
import PersonaPicker, { PersonaState, createPersonaState, resolvePersona } from '@/components/business/PersonaPicker';

interface OfferLite {
  id: string;
  title: string;
  description?: string | null;
  discounted_price: number;
  original_price: number;
  valid_until: string;
  image_url?: string;
  category?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  offer: OfferLite | null;
  businessId: string;
  businessName: string;
}

const THEMES: { key: OfferArtTheme; label: string; swatch: [string, string, string] }[] = [
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

export const GenerateAIArtModal: React.FC<Props> = ({
  isOpen, onClose, offer, businessId, businessName,
}) => {
  const { user } = useAuth();
  const [format, setFormat] = useState<OfferArtFormat>('post');
  const [theme, setTheme] = useState<OfferArtTheme>('dark');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('APROVEITE AGORA');
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [logoUrl, setLogoUrl] = useState<string | undefined>();
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number; bytes: number } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewTab, setReviewTab] = useState<'png' | 'pdf'>('png');
  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState<string | null>(null);
  const [textUsage, setTextUsage] = useState<{ used: number; limit: number | null }>({ used: 0, limit: null });

  const [persona, setPersona] = useState<PersonaState>(() => createPersonaState(offer?.category));

  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, offer?.category]);



  useEffect(() => {
    if (!isOpen || !offer) return;
    setTitle(offer.title || '');
    setDescription(offer.description || '');
    setCta('APROVEITE AGORA');
    setImageUrl(offer.image_url || undefined);
    (async () => {
      const [{ data: biz }, { data: textUsageData }, { data: sub }] = await Promise.all([
        supabase.from('businesses').select('logo_url').eq('id', businessId).maybeSingle(),
        supabase.rpc('get_ai_text_improvement_usage_this_month', { p_business_id: businessId }),
        supabase.from('business_subscriptions').select('id').eq('business_id', businessId)
          .in('status', ['active', 'trialing', 'paid', 'approved']).maybeSingle(),
      ]);
      setLogoUrl(biz?.logo_url || undefined);
      const isPaid = !!sub;
      setTextUsage({ used: textUsageData ?? 0, limit: isPaid ? null : 3 });
    })();
  }, [isOpen, offer?.id, businessId]);

  // Gera uma prévia leve (downscale) a partir do canvas em resolução total.
  const makePreviewBlob = async (c: HTMLCanvasElement): Promise<Blob> => {
    const maxSide = 1400;
    const r = Math.min(1, maxSide / Math.max(c.width, c.height));
    if (r >= 1) return canvasToPngBlob(c);
    const small = document.createElement('canvas');
    small.width = Math.round(c.width * r);
    small.height = Math.round(c.height * r);
    const sctx = small.getContext('2d')!;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(c, 0, 0, small.width, small.height);
    return canvasToPngBlob(small);
  };

  const buildPreview = async () => {
    if (!offer) return;
    setPreviewError(null);
    const baseParams = {
      format,
      theme,
      title,
      description,
      price: offer.discounted_price,
      originalPrice: offer.original_price,
      validUntil: offer.valid_until,
      businessName,
      businessLogoUrl: logoUrl,
      qrUrl: `${window.location.origin}/ofertas/${offer.id}`,
      cta,
      ...resolvePersona(persona, { businessName, category: offer.category }),
    };

    const attempt = async (withImage: boolean) => {
      const c = await renderOfferArt({ ...baseParams, imageUrl: withImage ? imageUrl : undefined });
      const blob = await makePreviewBlob(c);
      return { c, blob };
    };

    try {
      let result: { c: HTMLCanvasElement; blob: Blob };
      try {
        result = await attempt(true);
      } catch (inner) {
        // Canvas "tainted" (imagem sem CORS) ou falha ao ler a imagem: refaz sem a foto.
        console.warn('preview com imagem falhou, tentando sem imagem', inner);
        result = await attempt(false);
      }
      setCanvas(result.c);
      setPreviewSize({ w: result.c.width, h: result.c.height, bytes: result.blob.size });
      setPreviewUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(result.blob);
      });
    } catch (e: any) {
      console.error('offer preview failed', e);
      setCanvas(null);
      setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return null; });
      setPreviewError(e?.message || 'Não foi possível gerar a prévia da arte.');
    }
  };

  useEffect(() => {
    if (!isOpen || !offer) return;
    const t = setTimeout(() => { buildPreview(); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, offer?.id, format, theme, title, description, cta, imageUrl, logoUrl, persona]);


  const download = async (asPdf: boolean) => {
    if (!canvas || !offer) return;
    setGenerating(true);
    try {
      const blob = asPdf ? canvasToPdfBlob(canvas) : await canvasToPngBlob(canvas);
      downloadBlob(blob, `oferta-${offer.id}-${format}.${asPdf ? 'pdf' : 'png'}`);

      if (user) {
        const ext = asPdf ? 'pdf' : 'png';
        const fileName = `${user.id}/${offer.id}/${format}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('offer-ai-assets')
          .upload(fileName, blob, { contentType: asPdf ? 'application/pdf' : 'image/png', upsert: false });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('offer-ai-assets').getPublicUrl(fileName);
          await supabase.from('offer_ai_assets').insert({
            offer_id: offer.id,
            business_id: businessId,
            format,
            variation: 1,
            template: `canvas-${theme}`,
            image_url: asPdf ? '' : pub.publicUrl,
            pdf_url: asPdf ? pub.publicUrl : null,
            params: { format, theme, title, cta, description },
            created_by: user.id,
          });
        }
      }
      toast.success(`Arte ${asPdf ? 'PDF' : 'PNG'} baixada!`);
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao baixar arte');
    } finally {
      setGenerating(false);
    }
  };

  const handleImprove = async (field: 'title' | 'cta') => {
    if (!offer) return;
    setImproving(field);
    try {
      const current = field === 'title' ? title : cta;
      const { data, error } = await supabase.functions.invoke('improve-offer-text', {
        body: {
          businessId, field, currentText: current,
          context: { offerTitle: offer.title, price: offer.discounted_price, category: offer.category },
        },
      });
      if (error) {
        let msg = error.message;
        try {
          const ctx: any = (error as any).context;
          if (ctx?.json) { const j = await ctx.json(); msg = j?.error || msg; }
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      if (field === 'title') setTitle(data.text); else setCta(data.text);
      toast.success('Texto melhorado com IA!');
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao melhorar texto');
    } finally {
      setImproving(null);
    }
  };

  if (!offer) return null;
  const textImproveDisabled = textUsage.limit !== null && textUsage.used >= textUsage.limit;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Arte da Oferta
          </DialogTitle>
          <DialogDescription>
            Gere uma arte profissional da sua oferta. Escolha formato para redes sociais ou cartaz impresso.
          </DialogDescription>
        </DialogHeader>

        <div className="grid lg:grid-cols-[1fr_360px] gap-4 items-start">
          {/* Preview */}
          <div className="bg-muted/40 rounded-lg p-3 flex items-start justify-center min-h-[320px] lg:sticky lg:top-0">

            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Prévia da arte"
                className="max-h-[70vh] max-w-full object-contain rounded-md shadow-lg"
              />
            ) : previewError ? (
              <div className="text-center space-y-3 px-4">
                <p className="text-sm text-muted-foreground">{previewError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => buildPreview()}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Tentar novamente
                </Button>
              </div>
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
                {OFFER_ART_FORMATS.map((f) => (
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
              <Label>Título da arte</Label>
              <div className="flex gap-2 mt-1">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
                <Button type="button" variant="outline" size="sm"
                  onClick={() => handleImprove('title')}
                  disabled={improving !== null || textImproveDisabled}
                  title={textImproveDisabled ? 'Limite de IA atingido' : 'Melhorar com IA'}>
                  {improving === 'title'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : textImproveDisabled ? <Lock className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>CTA (botão)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={cta} onChange={(e) => setCta(e.target.value)} maxLength={24} />
                <Button type="button" variant="outline" size="sm"
                  onClick={() => handleImprove('cta')}
                  disabled={improving !== null || textImproveDisabled}
                  title={textImproveDisabled ? 'Limite de IA atingido' : 'Melhorar com IA'}>
                  {improving === 'cta'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : textImproveDisabled ? <Lock className="h-4 w-4" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <Label>Descrição (opcional)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={160} />
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
              category={offer?.category}
              value={persona}
              onChange={setPersona}
            />



            <div className="grid grid-cols-1 gap-2 pt-2">
              <Button
                onClick={() => { setReviewTab('png'); setReviewOpen(true); }}
                disabled={!canvas || generating}
                className="w-full"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Revisar antes de baixar
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                Você poderá conferir como ficará em PNG e PDF antes de salvar.
              </p>
            </div>
          </div>
        </div>

        {/* Review step: side-by-side PNG vs PDF mockup */}
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
          <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Revisão final — Como ficará o download
              </DialogTitle>
              <DialogDescription>
                Confira exatamente como a arte será exportada. Escolha PNG (redes sociais) ou PDF (impressão).
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2 mb-3 border-b border-border">
              {(['png', 'pdf'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setReviewTab(t)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
                    reviewTab === t
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'png' ? 'PNG — Redes sociais' : 'PDF — Cartaz impresso'}
                </button>
              ))}
            </div>

            <div className="grid md:grid-cols-[1fr_260px] gap-4">
              <div className={`rounded-lg p-4 flex items-center justify-center min-h-[380px] ${
                reviewTab === 'pdf'
                  ? 'bg-white border border-dashed border-border shadow-inner'
                  : 'bg-gradient-to-br from-muted/60 to-muted/20'
              }`}>
                {previewUrl ? (
                  <div
                    className={reviewTab === 'pdf'
                      ? 'bg-white p-4 shadow-xl border border-border/60 rounded-sm'
                      : 'rounded-lg overflow-hidden shadow-2xl ring-1 ring-black/20'
                    }
                    style={reviewTab === 'pdf' ? { maxWidth: '80%' } : {}}
                  >
                    <img
                      src={previewUrl}
                      alt={`Prévia ${reviewTab.toUpperCase()}`}
                      className="max-h-[60vh] max-w-full object-contain block"
                    />
                    {reviewTab === 'pdf' && (
                      <div className="mt-2 text-[10px] text-center text-muted-foreground uppercase tracking-wide">
                        Página A4 · margem de segurança
                      </div>
                    )}
                  </div>
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                )}
              </div>

              <div className="space-y-3 text-sm">
                <div className="rounded-md border border-border p-3 bg-muted/20">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Detalhes do arquivo</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Formato</span><span className="font-medium">{format}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Estilo</span><span className="font-medium capitalize">{theme}</span></div>
                    {previewSize && (
                      <>
                        <div className="flex justify-between"><span className="text-muted-foreground">Dimensões</span><span className="font-medium">{previewSize.w}×{previewSize.h}px</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tamanho aprox.</span><span className="font-medium">{(previewSize.bytes / 1024).toFixed(0)} KB</span></div>
                      </>
                    )}
                    <div className="flex justify-between"><span className="text-muted-foreground">Extensão</span><span className="font-medium">.{reviewTab}</span></div>
                  </div>
                </div>

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                  <div className="font-semibold text-primary mb-1">
                    {reviewTab === 'png' ? '📱 Ideal para redes sociais' : '🖨️ Ideal para impressão'}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    {reviewTab === 'png'
                      ? 'Compartilhe direto no Instagram, WhatsApp, Facebook. Qualidade otimizada para telas.'
                      : 'Envie para gráfica ou imprima em casa. Layout com margem de segurança para corte.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    onClick={() => { download(reviewTab === 'pdf'); setReviewOpen(false); }}
                    disabled={!canvas || generating}
                    className="w-full"
                  >
                    {generating
                      ? <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      : reviewTab === 'pdf'
                        ? <FileText className="h-4 w-4 mr-1" />
                        : <FileImage className="h-4 w-4 mr-1" />}
                    Baixar {reviewTab.toUpperCase()}
                  </Button>
                  <Button variant="outline" onClick={() => setReviewOpen(false)}>
                    Ajustar
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateAIArtModal;
