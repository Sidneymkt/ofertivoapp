import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, Send, Plus, Users, Building2, Calendar, Clock, CheckCircle, XCircle, Loader2, Eye, RefreshCw, Sparkles, Wand2, Image, Video, Paperclip, X, Link, Trash2, RotateCcw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CampaignFormData {
  title: string;
  subject: string;
  message: string;
  message_html: string;
  target_audience: 'consumers' | 'businesses' | 'both';
  use_html: boolean;
  ai_topic: string;
  ai_tone: 'promotional' | 'informative' | 'engagement' | 'reactivation';
  cta_url: string;
  image_urls: string[];
  video_urls: string[];
  attachment_urls: string[];
}

const defaultForm: CampaignFormData = {
  title: '',
  subject: '',
  message: '',
  message_html: '',
  target_audience: 'both',
  use_html: false,
  ai_topic: '',
  ai_tone: 'promotional',
  cta_url: 'https://ofertivoapp.com',
  image_urls: [],
  video_urls: [],
  attachment_urls: [],
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'outline' },
  scheduled: { label: 'Agendada', variant: 'secondary' },
  sending: { label: 'Enviando', variant: 'default' },
  completed: { label: 'Concluída', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
};

const audienceLabels: Record<string, string> = {
  consumers: 'Consumidores',
  businesses: 'Anunciantes',
  both: 'Todos',
};

const toneLabels: Record<string, string> = {
  promotional: 'Promocional',
  informative: 'Informativo',
  engagement: 'Engajamento',
  reactivation: 'Reativação',
};

export const AdminEmailMarketing = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmSendId, setConfirmSendId] = useState<string | null>(null);
  const [confirmRetryId, setConfirmRetryId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<any | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(defaultForm);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newAttachmentUrl, setNewAttachmentUrl] = useState('');
  const [uploading, setUploading] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileUpload = async (file: File, type: 'image' | 'video' | 'attachment') => {
    setUploading(type);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${type}s/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('marketing-media')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('marketing-media')
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;

      if (type === 'image') {
        setFormData(prev => ({ ...prev, image_urls: [...prev.image_urls, publicUrl] }));
      } else if (type === 'video') {
        setFormData(prev => ({ ...prev, video_urls: [...prev.video_urls, publicUrl] }));
      } else {
        setFormData(prev => ({ ...prev, attachment_urls: [...prev.attachment_urls, publicUrl] }));
      }
      toast.success(`${type === 'image' ? 'Imagem' : type === 'video' ? 'Vídeo' : 'Anexo'} enviado!`);
    } catch (err: any) {
      toast.error(`Erro no upload: ${err.message}`);
    } finally {
      setUploading(null);
    }
  };

  // AI content generation
  const generateAIContent = async (field: 'subject' | 'message' | 'html') => {
    if (!formData.ai_topic) {
      toast.error('Informe o tema/objetivo da campanha para gerar com IA');
      return;
    }
    setAiLoading(field);
    try {
      const audienceDesc = formData.target_audience === 'consumers' 
        ? 'consumidores que buscam ofertas e promoções locais'
        : formData.target_audience === 'businesses'
        ? 'anunciantes/comerciantes locais que utilizam a plataforma para divulgar ofertas'
        : 'todos os usuários da plataforma (consumidores e anunciantes)';
      
      const toneDesc = {
        promotional: 'tom promocional e persuasivo com urgência e call-to-action forte',
        informative: 'tom informativo e profissional com foco em novidades e valor',
        engagement: 'tom amigável e envolvente para aumentar engajamento e retenção',
        reactivation: 'tom acolhedor para reativar usuários inativos com incentivos',
      }[formData.ai_tone];

      let prompt = '';
      let type = 'marketing';

      if (field === 'subject') {
        prompt = `Crie um assunto de e-mail marketing para a plataforma Ofertivo (app de ofertas locais e gamificação na sua cidade).

TEMA DA CAMPANHA: ${formData.ai_topic}
PÚBLICO: ${audienceDesc}
TOM: ${toneDesc}

REGRAS:
- Máximo 60 caracteres
- Pode usar 1 emoji no início
- Deve gerar curiosidade e vontade de abrir o e-mail
- Use {{nome}} para personalizar com nome do destinatário se apropriado
- Linguagem profissional e direta

Retorne APENAS o assunto, sem aspas.`;
      } else if (field === 'message') {
        prompt = `Crie o texto de um e-mail marketing para a plataforma Ofertivo (app de ofertas locais, gamificação e sorteios na sua cidade).

TEMA: ${formData.ai_topic}
PÚBLICO: ${audienceDesc}
TOM: ${toneDesc}
ASSUNTO: ${formData.subject || '(ainda não definido)'}

REGRAS:
- Entre 300 e 600 caracteres
- Use {{nome}} para personalização
- Inclua call-to-action claro direcionando para: ${formData.cta_url || 'https://ofertivoapp.com'}
- Mencione benefícios concretos da plataforma (pontos, ofertas, sorteios)
- Finalize com assinatura "Equipe Ofertivo"
- Pode usar emojis estratégicos (máx 4)
- Linguagem profissional e persuasiva

Retorne APENAS o texto do e-mail.`;
      } else {
        const imageCount = formData.image_urls.length;
        const videoCount = formData.video_urls.length;
        const totalMedia = imageCount + videoCount;

        const mediaInstructions = [];
        if (imageCount > 0) {
          const imageLayout = imageCount === 1
            ? 'Exiba a imagem em largura total (100%) centralizada.'
            : imageCount === 2
            ? 'Distribua as 2 imagens lado a lado em 2 colunas (cada uma ~50% width) usando uma <table> com 2 <td>. Em mobile (max-width: 480px), empilhe verticalmente.'
            : imageCount === 3
            ? 'Distribua as 3 imagens: primeira em largura total e as 2 seguintes lado a lado (50% cada) usando <table>. Em mobile, empilhe verticalmente.'
            : `Distribua as ${imageCount} imagens em grid de 2 colunas usando <table> com múltiplas <tr> de 2 <td>. Em mobile (max-width: 480px), empilhe verticalmente.`;
          mediaInstructions.push(`IMAGENS (${imageCount}):
- URLs: ${formData.image_urls.join(', ')}
- Layout: ${imageLayout}
- Cada <img> deve ter: style="width:100%;height:auto;display:block;border-radius:8px;" alt="Imagem da campanha"
- Adicione padding de 4px entre imagens no grid
- Use uma seção dedicada com título "📸" ou integre no corpo do conteúdo de forma natural`);
        }
        if (videoCount > 0) {
          const videoLayout = videoCount === 1
            ? 'Exiba o vídeo em largura total centralizado.'
            : `Distribua os ${videoCount} vídeos em grid de 2 colunas usando <table>. Em mobile, empilhe verticalmente.`;
          mediaInstructions.push(`VÍDEOS (${videoCount}):
- URLs: ${formData.video_urls.join(', ')}
- Layout: ${videoLayout}
- Para cada vídeo crie um bloco visual com: fundo escuro (#1A1A2E), border-radius:8px, botão de play centralizado (triângulo branco ▶ dentro de um círculo com borda branca), e link <a> envolvendo tudo apontando para a URL do vídeo
- Texto "Assistir vídeo" abaixo do botão play
- Adicione padding de 4px entre vídeos no grid`);
        }
        if (formData.attachment_urls.length > 0) {
          mediaInstructions.push(`ANEXOS:
- URLs: ${formData.attachment_urls.join(', ')}
- Exiba como lista de links de download com ícone 📎, nome do arquivo extraído da URL e botão "Baixar" estilizado
- Use background #F5F5F5, border-radius:8px, padding:12px para cada item`);
        }

        const mediaSection = totalMedia > 0 ? `
LAYOUT DE MÍDIA RESPONSIVO (OBRIGATÓRIO):
- Use <table> com cellpadding="0" cellspacing="0" border="0" width="100%" para layouts de grid (NÃO use CSS grid ou flexbox pois emails não suportam)
- Para layouts de 2 colunas: use <table><tr><td width="50%" valign="top" style="padding:4px;">...</td><td width="50%" valign="top" style="padding:4px;">...</td></tr></table>
- Inclua @media only screen and (max-width:480px) no <style> do <head> para forçar td a display:block e width:100% em mobile
- Posicione a mídia APÓS o texto introdutório e ANTES do CTA principal
- Separe seções de imagens e vídeos com espaçamento de 16px
${mediaInstructions.join('\n\n')}` : '';

        prompt = `Crie um e-mail HTML responsivo e visualmente atrativo para a plataforma Ofertivo.

TEMA: ${formData.ai_topic}
PÚBLICO: ${audienceDesc}
TOM: ${toneDesc}
ASSUNTO: ${formData.subject || '(ainda não definido)'}
MENSAGEM BASE: ${formData.message || '(use o tema para criar)'}

REGRAS:
- HTML inline-styled (compatível com clientes de email)
- Paleta de cores: #FF6B35 (laranja primário), #1A1A2E (escuro), #FFFFFF (branco)
- Layout com header (logo texto "Ofertivo"), corpo principal e footer
- Use {{nome}} para personalização
- Inclua botão CTA estilizado com cor #FF6B35 apontando para: ${formData.cta_url || 'https://ofertivoapp.com'}
- Footer com "Equipe Ofertivo - Sua cidade", link para o site (${formData.cta_url || 'https://ofertivoapp.com'}) e link para descadastrar
- Container principal max-width: 600px centralizado
- Profissional e moderno
- Inclua <style> no <head> com @media query para responsividade mobile
${mediaSection}

Retorne APENAS o código HTML completo.`;
      }

      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { prompt, type },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro na IA');
      }

      const generated = data.generatedText.trim();

      if (field === 'subject') {
        setFormData(prev => ({ ...prev, subject: generated }));
      } else if (field === 'message') {
        setFormData(prev => ({ ...prev, message: generated }));
      } else {
        setFormData(prev => ({ ...prev, message_html: generated, use_html: true }));
      }

      toast.success(`${field === 'subject' ? 'Assunto' : field === 'message' ? 'Mensagem' : 'HTML'} gerado com IA!`);
    } catch (err: any) {
      toast.error(`Erro ao gerar conteúdo: ${err.message}`);
    } finally {
      setAiLoading(null);
    }
  };

  const generateFullCampaign = async () => {
    if (!formData.ai_topic) {
      toast.error('Informe o tema/objetivo da campanha');
      return;
    }
    setAiLoading('full');
    try {
      const audienceDesc = formData.target_audience === 'consumers' 
        ? 'consumidores que buscam ofertas e promoções locais'
        : formData.target_audience === 'businesses'
        ? 'anunciantes/comerciantes locais que utilizam a plataforma para divulgar ofertas'
        : 'todos os usuários da plataforma (consumidores e anunciantes)';
      
      const toneDesc = {
        promotional: 'tom promocional e persuasivo com urgência e call-to-action forte',
        informative: 'tom informativo e profissional com foco em novidades e valor',
        engagement: 'tom amigável e envolvente para aumentar engajamento e retenção',
        reactivation: 'tom acolhedor para reativar usuários inativos com incentivos',
      }[formData.ai_tone];

      const mediaInfo = [];
      if (formData.image_urls.length > 0) {
        mediaInfo.push(`IMAGENS para incluir no HTML (${formData.image_urls.length}): ${formData.image_urls.join(', ')}`);
      }
      if (formData.video_urls.length > 0) {
        mediaInfo.push(`VÍDEOS para incluir no HTML (${formData.video_urls.length}): ${formData.video_urls.join(', ')}`);
      }

      const prompt = `Gere uma campanha COMPLETA de e-mail marketing para a plataforma Ofertivo (app de ofertas locais, gamificação e sorteios na sua cidade).

TEMA DA CAMPANHA: ${formData.ai_topic}
PÚBLICO: ${audienceDesc}
TOM: ${toneDesc}
${mediaInfo.length > 0 ? '\nMÍDIA DISPONÍVEL:\n' + mediaInfo.join('\n') : ''}

Retorne um JSON com EXATAMENTE estas 3 chaves:

{
  "subject": "Assunto do e-mail (máx 60 chars, pode usar 1 emoji, use {{nome}} se apropriado)",
  "message": "Texto plano do e-mail (300-600 chars, use {{nome}}, inclua CTA com link para ${formData.cta_url || 'https://ofertivoapp.com'}, finalize com Equipe Ofertivo, máx 4 emojis)",
  "html": "HTML completo inline-styled responsivo com: header (logo texto Ofertivo), corpo principal com conteúdo persuasivo, botão CTA cor #FF6B35 apontando para ${formData.cta_url || 'https://ofertivoapp.com'}, footer com Equipe Ofertivo - Sua cidade e links para o site (${formData.cta_url || 'https://ofertivoapp.com'}). Use {{nome}} para personalização. Paleta: #FF6B35 (laranja), #1A1A2E (escuro), #FFFFFF (branco). Container max-width 600px. Inclua @media query para mobile. ${formData.image_urls.length > 0 ? 'Inclua as imagens fornecidas com width 100% e border-radius 8px.' : ''} ${formData.video_urls.length > 0 ? 'Inclua blocos de vídeo com botão play e link.' : ''}"
}

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem blocos de código, sem explicações.`;

      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { prompt, type: 'full_email' },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro na IA');
      }

      let generated = data.generatedText.trim();
      // Remove markdown code block if present
      generated = generated.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
      
      let parsed: { subject?: string; message?: string; html?: string };
      try {
        parsed = JSON.parse(generated);
      } catch (jsonErr) {
        // Try to fix truncated JSON by closing open strings and braces
        console.warn('JSON parse failed, attempting repair:', jsonErr);
        let repaired = generated;
        // If the string was truncated mid-value, close it
        const lastQuote = repaired.lastIndexOf('"');
        const lastColon = repaired.lastIndexOf(':');
        if (lastColon > lastQuote) {
          // value was never started or truncated before quote
          repaired += '""';
        }
        // Ensure it ends with }
        if (!repaired.trimEnd().endsWith('}')) {
          // Close any open string
          const quoteCount = (repaired.match(/(?<!\\)"/g) || []).length;
          if (quoteCount % 2 !== 0) repaired += '"';
          repaired += '}';
        }
        try {
          parsed = JSON.parse(repaired);
        } catch {
          throw new Error('IA retornou JSON inválido. Tente novamente com um tema mais curto.');
        }
      }

      if (!parsed.subject || !parsed.message) {
        throw new Error('IA retornou formato incompleto. Tente novamente.');
      }
      
      // If HTML was truncated, use message as fallback
      if (!parsed.html) {
        parsed.html = `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;padding:20px;"><h1 style="color:#FF6B35;">Ofertivo</h1><p>${parsed.message}</p><p style="color:#999;font-size:12px;">Equipe Ofertivo - Sua cidade</p></div>`;
      }

      setFormData(prev => ({
        ...prev,
        title: prev.ai_topic,
        subject: parsed.subject,
        message: parsed.message,
        message_html: parsed.html,
        use_html: true,
      }));

      toast.success('Campanha completa gerada com IA!');
    } catch (err: any) {
      console.error('Erro ao gerar campanha completa:', err);
      toast.error(`Erro ao gerar campanha: ${err.message}`);
    } finally {
      setAiLoading(null);
    }
  };

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['marketing-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    // Auto-refresh every 5s when any campaign is sending
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      const hasSending = data?.some((c: any) => c.status === 'sending');
      return hasSending ? 5000 : false;
    },
  });

  // Campaign stats
  const { data: stats } = useQuery({
    queryKey: ['marketing-stats'],
    queryFn: async () => {
      const [total, sent, draft] = await Promise.all([
        supabase.from('marketing_campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('marketing_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('marketing_campaigns').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
      ]);
      
      // Sum sent_count from completed campaigns
      const { data: sentData } = await supabase
        .from('marketing_campaigns')
        .select('sent_count')
        .eq('status', 'completed');
      
      const totalSent = sentData?.reduce((acc, c) => acc + (c.sent_count || 0), 0) || 0;

      return {
        total: total.count || 0,
        completed: sent.count || 0,
        drafts: draft.count || 0,
        totalSent,
      };
    },
  });

  // Create campaign (save as draft)
  const createCampaign = useMutation({
    mutationFn: async (data: CampaignFormData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('marketing_campaigns').insert({
        title: data.title,
        subject: data.subject,
        message: data.message,
        message_html: data.use_html ? data.message_html : null,
        channel: 'email',
        target_audience: data.target_audience,
        status: 'draft',
        created_by: user.id,
        filters: {
          image_urls: data.image_urls,
          video_urls: data.video_urls,
          attachment_urls: data.attachment_urls,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
      toast.success('Campanha criada como rascunho');
      setIsCreateOpen(false);
      setFormData(defaultForm);
    },
    onError: () => toast.error('Erro ao criar campanha'),
  });

  // Send campaign
  const sendCampaign = useMutation({
    mutationFn: async ({ campaignId, retryFailed = false }: { campaignId: string; retryFailed?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('send-marketing-email', {
        body: { campaign_id: campaignId, retry_failed: retryFailed },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
      if (data.message === 'Retry completed') {
        toast.success(`Reenvio concluído! ${data.sent} recuperados, ${data.failed} ainda falharam.`);
      } else if (data.message === 'No failed emails to retry') {
        toast.info('Nenhum e-mail falho para reenviar.');
      } else {
        toast.success(`Campanha enviada! ${data.sent} enviados, ${data.failed} falharam de ${data.total}.`);
      }
      setConfirmSendId(null);
      setConfirmRetryId(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao enviar: ${error.message}`);
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      setConfirmSendId(null);
      setConfirmRetryId(null);
    },
  });

  // Delete draft campaign
  const deleteCampaign = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('marketing_campaigns')
        .delete()
        .eq('id', campaignId)
        .eq('status', 'draft');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['marketing-stats'] });
      toast.success('Rascunho excluído com sucesso');
      setConfirmDeleteId(null);
    },
    onError: () => {
      toast.error('Erro ao excluir rascunho');
      setConfirmDeleteId(null);
    },
  });

  const handleCreate = () => {
    if (!formData.title || !formData.subject || !formData.message) {
      toast.error('Preencha título, assunto e mensagem');
      return;
    }
    createCampaign.mutate(formData);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                E-mail Marketing
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Crie e envie campanhas de e-mail para seus usuários via Resend
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Campanha
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Criar Campanha de E-mail</DialogTitle>
                  <DialogDescription>
                    Configure e salve como rascunho. Use {'{{nome}}'} para personalizar.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* AI Generation Section */}
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <Label className="font-semibold text-primary">Gerar com IA</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Tema/Objetivo da campanha</Label>
                      <Input
                        value={formData.ai_topic}
                        onChange={(e) => setFormData(prev => ({ ...prev, ai_topic: e.target.value }))}
                        placeholder="Ex: Promoção de Carnaval, Novas funcionalidades, Reativar usuários inativos..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Tom da mensagem</Label>
                      <Select
                        value={formData.ai_tone}
                        onValueChange={(v: 'promotional' | 'informative' | 'engagement' | 'reactivation') =>
                          setFormData(prev => ({ ...prev, ai_tone: v }))
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="promotional">🔥 Promocional</SelectItem>
                          <SelectItem value="informative">📢 Informativo</SelectItem>
                          <SelectItem value="engagement">💬 Engajamento</SelectItem>
                          <SelectItem value="reactivation">🔄 Reativação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Link do botão CTA</Label>
                      <Input
                        value={formData.cta_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, cta_url: e.target.value }))}
                        placeholder="https://ofertivoapp.com"
                      />
                      <p className="text-[10px] text-muted-foreground">URL usada nos botões de chamada para ação do e-mail</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateAIContent('subject')}
                        disabled={!!aiLoading}
                      >
                        {aiLoading === 'subject' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                        Assunto
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateAIContent('message')}
                        disabled={!!aiLoading}
                      >
                        {aiLoading === 'message' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                        Mensagem
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => generateAIContent('html')}
                        disabled={!!aiLoading}
                      >
                        {aiLoading === 'html' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                        HTML
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={generateFullCampaign}
                        disabled={!!aiLoading}
                        className="ml-auto"
                      >
                        {aiLoading === 'full' ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Gerar Tudo
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Título interno</Label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Ex: Campanha de Natal 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Assunto do e-mail</Label>
                    </div>
                    <Input
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Ex: 🎄 Ofertas especiais para você, {{nome}}!"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Público-alvo</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(v: 'consumers' | 'businesses' | 'both') =>
                        setFormData(prev => ({ ...prev, target_audience: v }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">
                          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Todos os usuários</span>
                        </SelectItem>
                        <SelectItem value="consumers">
                          <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Apenas consumidores</span>
                        </SelectItem>
                        <SelectItem value="businesses">
                          <span className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Apenas anunciantes</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Usar HTML personalizado</Label>
                    <Switch
                      checked={formData.use_html}
                      onCheckedChange={(v) => setFormData(prev => ({ ...prev, use_html: v }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{formData.use_html ? 'Mensagem (texto fallback)' : 'Mensagem'}</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                      placeholder="Digite a mensagem do e-mail... Use {{nome}} para o nome do destinatário"
                      rows={4}
                    />
                  </div>
                  {formData.use_html && (
                    <div className="space-y-2">
                      <Label>HTML do e-mail</Label>
                      <Textarea
                        value={formData.message_html}
                        onChange={(e) => setFormData(prev => ({ ...prev, message_html: e.target.value }))}
                        placeholder="<html><body><h1>Olá {{nome}}</h1>...</body></html>"
                        rows={6}
                        className="font-mono text-xs"
                      />
                    </div>
                  )}

                  {/* Images */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Image className="h-3.5 w-3.5" /> Imagens
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Cole uma URL ou faça upload"
                        className="text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newImageUrl.trim()) {
                            setFormData(prev => ({ ...prev, image_urls: [...prev.image_urls, newImageUrl.trim()] }));
                            setNewImageUrl('');
                          }
                        }}
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'image');
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploading === 'image'}
                      >
                        {uploading === 'image' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                    {formData.image_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.image_urls.map((url, i) => (
                          <div key={i} className="relative group">
                            <img src={url} alt="" className="h-16 w-16 object-cover rounded border" />
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, image_urls: prev.image_urls.filter((_, idx) => idx !== i) }))}
                              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Videos */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Video className="h-3.5 w-3.5" /> Vídeos
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={newVideoUrl}
                        onChange={(e) => setNewVideoUrl(e.target.value)}
                        placeholder="URL do YouTube ou faça upload"
                        className="text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newVideoUrl.trim()) {
                            setFormData(prev => ({ ...prev, video_urls: [...prev.video_urls, newVideoUrl.trim()] }));
                            setNewVideoUrl('');
                          }
                        }}
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'video');
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => videoInputRef.current?.click()}
                        disabled={uploading === 'video'}
                      >
                        {uploading === 'video' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                    {formData.video_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.video_urls.map((url, i) => (
                          <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs max-w-[250px]">
                            <Video className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{url.split('/').pop()}</a>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, video_urls: prev.video_urls.filter((_, idx) => idx !== i) }))}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attachments */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5" /> Anexos
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={newAttachmentUrl}
                        onChange={(e) => setNewAttachmentUrl(e.target.value)}
                        placeholder="URL do arquivo ou faça upload"
                        className="text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (newAttachmentUrl.trim()) {
                            setFormData(prev => ({ ...prev, attachment_urls: [...prev.attachment_urls, newAttachmentUrl.trim()] }));
                            setNewAttachmentUrl('');
                          }
                        }}
                      >
                        <Link className="h-3 w-3" />
                      </Button>
                      <input
                        ref={attachmentInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file, 'attachment');
                          e.target.value = '';
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={uploading === 'attachment'}
                      >
                        {uploading === 'attachment' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                      </Button>
                    </div>
                    {formData.attachment_urls.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.attachment_urls.map((url, i) => (
                          <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs max-w-[250px]">
                            <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                            <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-primary hover:underline">{decodeURIComponent(url.split('/').pop() || '')}</a>
                            <button
                              type="button"
                              onClick={() => setFormData(prev => ({ ...prev, attachment_urls: prev.attachment_urls.filter((_, idx) => idx !== i) }))}
                              className="shrink-0 text-muted-foreground hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreate} disabled={createCampaign.isPending}>
                    {createCampaign.isPending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Salvando...</>
                    ) : (
                      'Salvar Rascunho'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Campanhas</span>
              </div>
              <p className="text-xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-xs text-muted-foreground">Enviadas</span>
              </div>
              <p className="text-xl font-bold mt-1 text-green-500">{stats.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-muted-foreground">Rascunhos</span>
              </div>
              <p className="text-xl font-bold mt-1 text-yellow-500">{stats.drafts}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">E-mails enviados</span>
              </div>
              <p className="text-xl font-bold mt-1 text-blue-500">{stats.totalSent}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign list */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base sm:text-lg">Campanhas</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] })}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Carregando campanhas...</p>
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Campanha</TableHead>
                      <TableHead className="min-w-[100px]">Público</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                      <TableHead className="min-w-[80px] hidden sm:table-cell">Enviados</TableHead>
                      <TableHead className="min-w-[120px] hidden md:table-cell">Data</TableHead>
                      <TableHead className="min-w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.map((campaign) => {
                      const statusInfo = statusLabels[campaign.status] || { label: campaign.status, variant: 'outline' as const };
                      return (
                        <TableRow key={campaign.id}>
                          <TableCell>
                            <p className="font-medium text-sm line-clamp-1">{campaign.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{campaign.subject}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {audienceLabels[campaign.target_audience] || campaign.target_audience}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusInfo.variant} className="text-xs">
                              {campaign.status === 'sending' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                              {statusInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span className="text-sm">
                              {campaign.sent_count || 0}/{campaign.total_recipients || 0}
                            </span>
                            {(campaign.failed_count || 0) > 0 && (
                              <span className="text-xs text-destructive ml-1">
                                ({campaign.failed_count} erros)
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(campaign.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPreviewCampaign(campaign)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {campaign.status === 'draft' && (
                                <>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => setConfirmSendId(campaign.id)}
                                    title="Enviar"
                                  >
                                    <Send className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setConfirmDeleteId(campaign.id)}
                                    title="Excluir rascunho"
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {campaign.status === 'sending' && (
                                <Badge variant="secondary" className="text-xs">
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  {campaign.sent_count || 0}/{campaign.total_recipients || '?'}
                                </Badge>
                              )}
                              {campaign.status === 'completed' && (campaign.failed_count || 0) > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setConfirmRetryId(campaign.id)}
                                  title="Reenviar e-mails com falha"
                                  className="text-orange-500 hover:text-orange-600"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma campanha criada ainda</p>
              <p className="text-xs text-muted-foreground mt-1">Clique em "Nova Campanha" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send confirmation */}
      <AlertDialog open={!!confirmSendId} onOpenChange={() => setConfirmSendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio da campanha</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação enviará e-mails para todos os destinatários do público-alvo selecionado.
              Esta ação não pode ser desfeita. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendCampaign.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmSendId && sendCampaign.mutate({ campaignId: confirmSendId })}
              disabled={sendCampaign.isPending}
            >
              {sendCampaign.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Confirmar Envio</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rascunho</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este rascunho? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCampaign.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDeleteId && deleteCampaign.mutate(confirmDeleteId)}
              disabled={deleteCampaign.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCampaign.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Excluindo...</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Excluir</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retry failed confirmation */}
      <AlertDialog open={!!confirmRetryId} onOpenChange={() => setConfirmRetryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar e-mails com falha</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação tentará reenviar apenas os e-mails que falharam nesta campanha.
              Os e-mails já enviados com sucesso não serão reenviados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sendCampaign.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRetryId && sendCampaign.mutate({ campaignId: confirmRetryId, retryFailed: true })}
              disabled={sendCampaign.isPending}
            >
              {sendCampaign.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reenviando...</>
              ) : (
                <><RotateCcw className="h-4 w-4 mr-2" /> Reenviar Falhos</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!previewCampaign} onOpenChange={() => setPreviewCampaign(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Campanha</DialogTitle>
          </DialogHeader>
          {previewCampaign && (() => {
            const filters = previewCampaign.filters as { image_urls?: string[]; video_urls?: string[]; attachment_urls?: string[] } | null;
            const imageUrls = filters?.image_urls || [];
            const videoUrls = filters?.video_urls || [];
            const attachmentUrls = filters?.attachment_urls || [];
            return (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <p className="font-medium">{previewCampaign.title}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Assunto</Label>
                <p>{previewCampaign.subject}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Público</Label>
                <Badge variant="outline">{audienceLabels[previewCampaign.target_audience]}</Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={statusLabels[previewCampaign.status]?.variant || 'outline'}>
                    {statusLabels[previewCampaign.status]?.label || previewCampaign.status}
                  </Badge>
                  {previewCampaign.sent_count > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {previewCampaign.sent_count} enviados / {previewCampaign.failed_count || 0} falhas
                    </span>
                  )}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Mensagem</Label>
                <div className="p-3 bg-muted rounded-md mt-1 text-sm whitespace-pre-wrap">
                  {previewCampaign.message}
                </div>
              </div>
              {imageUrls.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Image className="h-3.5 w-3.5" /> Imagens ({imageUrls.length})
                  </Label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {imageUrls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`Imagem ${i + 1}`} className="w-full h-auto rounded-md border object-cover max-h-48" />
                    ))}
                  </div>
                </div>
              )}
              {videoUrls.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5" /> Vídeos ({videoUrls.length})
                  </Label>
                  <div className="space-y-2 mt-1">
                    {videoUrls.map((url: string, i: number) => (
                      <div key={i} className="rounded-md border overflow-hidden">
                        <video src={url} controls className="w-full max-h-56" preload="metadata" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {attachmentUrls.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Paperclip className="h-3.5 w-3.5" /> Anexos ({attachmentUrls.length})
                  </Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {attachmentUrls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs text-primary hover:underline">
                        <Paperclip className="h-3 w-3" />
                        {decodeURIComponent(url.split('/').pop() || `Anexo ${i + 1}`)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {previewCampaign.message_html && (
                <div>
                  <Label className="text-xs text-muted-foreground">Preview HTML</Label>
                  <div className="mt-1 border rounded-md overflow-hidden">
                    <iframe
                      srcDoc={previewCampaign.message_html}
                      className="w-full bg-white"
                      style={{ minHeight: '400px', border: 'none' }}
                      title="Preview do e-mail HTML"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
              {previewCampaign.sent_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Enviado em</Label>
                  <p className="text-sm">{format(new Date(previewCampaign.sent_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              )}
            </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
