import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Mail, Users, Building2, Edit, Save, Plus, Trash2, Clock, 
  CheckCircle, ArrowDown, Loader2, Play, Pause, Sparkles, Wand2, RotateCcw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface FunnelTemplate {
  id: string;
  funnel_type: 'consumer' | 'business';
  step_order: number;
  delay_days: number;
  subject: string;
  message: string;
  message_html: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditingTemplate {
  id?: string;
  funnel_type: 'consumer' | 'business';
  step_order: number;
  delay_days: number;
  subject: string;
  message: string;
  message_html: string;
  is_active: boolean;
}

export const AdminEmailFunnels = () => {
  const [activeFunnel, setActiveFunnel] = useState<'consumer' | 'business'>('consumer');
  const [editingTemplate, setEditingTemplate] = useState<EditingTemplate | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['email-funnel-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_funnel_templates')
        .select('*')
        .order('funnel_type')
        .order('step_order');
      if (error) throw error;
      return (data || []) as FunnelTemplate[];
    },
  });

  const { data: sentStats } = useQuery({
    queryKey: ['email-funnel-sent-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_funnel_sent')
        .select('template_id, status');
      if (error) throw error;
      const stats: Record<string, { sent: number; failed: number }> = {};
      (data || []).forEach((r: any) => {
        if (!stats[r.template_id]) stats[r.template_id] = { sent: 0, failed: 0 };
        if (r.status === 'sent') stats[r.template_id].sent++;
        else stats[r.template_id].failed++;
      });
      return stats;
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async (template: EditingTemplate) => {
      if (template.id) {
        const { error } = await supabase
          .from('email_funnel_templates')
          .update({
            subject: template.subject,
            message: template.message,
            message_html: template.message_html || null,
            delay_days: template.delay_days,
            is_active: template.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('email_funnel_templates')
          .insert({
            funnel_type: template.funnel_type,
            step_order: template.step_order,
            delay_days: template.delay_days,
            subject: template.subject,
            message: template.message,
            message_html: template.message_html || null,
            is_active: template.is_active,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-funnel-templates'] });
      toast.success('Template salvo com sucesso!');
      setIsEditOpen(false);
      setEditingTemplate(null);
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('email_funnel_templates').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-funnel-templates'] });
      toast.success('Template removido');
    },
    onError: (e: any) => toast.error(`Erro: ${e.message}`),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('email_funnel_templates')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-funnel-templates'] });
    },
  });

  const generateAIContent = async () => {
    if (!editingTemplate) return;
    setAiLoading(true);
    try {
      const isConsumer = editingTemplate.funnel_type === 'consumer';
      const step = editingTemplate.step_order;
      const prompt = `Crie o conteúdo de um e-mail para o passo ${step} de um funil de onboarding ${isConsumer ? 'de consumidores' : 'de anunciantes/comerciantes'} da plataforma Ofertivo (app de ofertas locais, gamificação e sorteios na sua cidade).

CONTEXTO DO PASSO ${step}:
- Delay: ${editingTemplate.delay_days} dias após cadastro
- Tipo: ${isConsumer ? 'Consumidor final buscando ofertas e economia' : 'Anunciante/comerciante querendo atrair clientes'}

REGRAS:
- Use {{nome}} para personalização
- Entre 200 e 500 caracteres na mensagem
- Tom profissional, amigável e persuasivo
- Inclua emojis estratégicos (máx 4)
- SEMPRE inclua um botão de chamada para ação (CTA) direcionando para https://ofertivoapp.com no final da mensagem, antes da assinatura
- Finalize com "Equipe Ofertivo"
- Crie também um assunto de email atrativo (máx 60 caracteres, pode ter 1 emoji)

Retorne no formato JSON:
{"subject": "assunto aqui", "message": "mensagem aqui"}`;

      const { data, error } = await supabase.functions.invoke('gemini-ai', {
        body: { prompt, type: 'marketing' },
      });
      if (error || !data?.success) throw new Error(data?.error || 'Erro na IA');

      try {
        const cleaned = data.generatedText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        setEditingTemplate(prev => prev ? {
          ...prev,
          subject: parsed.subject || prev.subject,
          message: parsed.message || prev.message,
        } : null);
        toast.success('Conteúdo gerado com IA!');
      } catch {
        setEditingTemplate(prev => prev ? { ...prev, message: data.generatedText } : null);
      }
    } catch (err: any) {
      toast.error(`Erro ao gerar: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const filteredTemplates = templates?.filter(t => t.funnel_type === activeFunnel) || [];

  const handleEdit = (t: FunnelTemplate) => {
    setEditingTemplate({
      id: t.id,
      funnel_type: t.funnel_type,
      step_order: t.step_order,
      delay_days: t.delay_days,
      subject: t.subject,
      message: t.message,
      message_html: t.message_html || '',
      is_active: t.is_active,
    });
    setIsEditOpen(true);
  };

  const handleAddNew = () => {
    const maxStep = filteredTemplates.reduce((max, t) => Math.max(max, t.step_order), 0);
    setEditingTemplate({
      funnel_type: activeFunnel,
      step_order: maxStep + 1,
      delay_days: maxStep === 0 ? 0 : 7,
      subject: '',
      message: '',
      message_html: '',
      is_active: true,
    });
    setIsEditOpen(true);
  };

  const processManualFunnel = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('process-email-funnel');
      if (error) throw error;
      toast.success(`Funil processado! ${data?.sent || 0} e-mails enviados.`);
      queryClient.invalidateQueries({ queryKey: ['email-funnel-sent-stats'] });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                Funis de E-mail Automáticos
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Sequências de e-mails enviadas automaticamente após o cadastro de consumidores e anunciantes
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={processManualFunnel}>
                <Play className="h-4 w-4 mr-1" />
                Processar Agora
              </Button>
              <Button size="sm" onClick={handleAddNew}>
                <Plus className="h-4 w-4 mr-1" />
                Novo Passo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeFunnel} onValueChange={(v) => setActiveFunnel(v as 'consumer' | 'business')}>
            <TabsList className="mb-4">
              <TabsTrigger value="consumer" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Consumidores
              </TabsTrigger>
              <TabsTrigger value="business" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Anunciantes
              </TabsTrigger>
            </TabsList>

            {['consumer', 'business'].map(type => (
              <TabsContent key={type} value={type}>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-10 w-10 mx-auto mb-2 opacity-50" />
                    <p>Nenhum template configurado para este funil.</p>
                    <Button variant="outline" className="mt-3" onClick={handleAddNew}>
                      <Plus className="h-4 w-4 mr-1" /> Criar primeiro passo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredTemplates.map((template, idx) => (
                      <React.Fragment key={template.id}>
                        <Card className={`border ${template.is_active ? 'border-primary/30 bg-primary/5' : 'border-muted opacity-60'}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="text-xs">
                                    Passo {template.step_order}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {template.delay_days === 0 ? 'Imediato' : `+${template.delay_days} dia${template.delay_days > 1 ? 's' : ''}`}
                                  </Badge>
                                  {template.is_active ? (
                                    <Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Ativo
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">
                                      <Pause className="h-3 w-3 mr-1" /> Inativo
                                    </Badge>
                                  )}
                                  {sentStats?.[template.id] && (
                                    <Badge variant="outline" className="text-xs">
                                      📧 {sentStats[template.id].sent} enviados
                                    </Badge>
                                  )}
                                </div>
                                <h4 className="font-medium text-sm truncate">{template.subject}</h4>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{template.message}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <Switch
                                  checked={template.is_active}
                                  onCheckedChange={(checked) => toggleActive.mutate({ id: template.id, is_active: checked })}
                                />
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(template)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => deleteTemplate.mutate(template.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        {idx < filteredTemplates.length - 1 && (
                          <div className="flex justify-center">
                            <ArrowDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate?.id ? 'Editar' : 'Novo'} Passo do Funil
            </DialogTitle>
            <DialogDescription>
              Configure o e-mail para o passo {editingTemplate?.step_order} do funil de {editingTemplate?.funnel_type === 'consumer' ? 'consumidores' : 'anunciantes'}.
            </DialogDescription>
          </DialogHeader>

          {editingTemplate && (
            <div className="space-y-4">
              {/* AI Generate */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateAIContent}
                  disabled={aiLoading}
                  className="w-full"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Gerar conteúdo com IA
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Ordem do passo</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingTemplate.step_order}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, step_order: parseInt(e.target.value) || 1 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Delay (dias após cadastro)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editingTemplate.delay_days}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, delay_days: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Assunto do e-mail</Label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="Ex: 👋 Bem-vindo ao Ofertivo, {{nome}}!"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Mensagem (texto)</Label>
                <Textarea
                  value={editingTemplate.message}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                  rows={8}
                  placeholder="Corpo do e-mail. Use {{nome}} para personalizar."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">HTML personalizado (opcional)</Label>
                <Textarea
                  value={editingTemplate.message_html}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, message_html: e.target.value })}
                  rows={4}
                  placeholder="Cole aqui o HTML do e-mail se desejar uma versão visual personalizada."
                  className="font-mono text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={editingTemplate.is_active}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: checked })}
                />
                <Label className="text-sm">Template ativo</Label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => editingTemplate && updateTemplate.mutate(editingTemplate)}
              disabled={updateTemplate.isPending}
            >
              {updateTemplate.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
