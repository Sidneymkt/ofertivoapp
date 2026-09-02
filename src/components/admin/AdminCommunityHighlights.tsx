import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Star, Gift, Ticket, Award, Trophy, ArrowUpDown } from 'lucide-react';

interface HighlightForm {
  business_id: string;
  tipo_destaque: string;
  titulo: string;
  descricao_curta: string;
  link_destino: string;
  imagem: string;
  prioridade: number;
  ativo: boolean;
}

const emptyForm: HighlightForm = {
  business_id: '',
  tipo_destaque: 'oferta',
  titulo: '',
  descricao_curta: '',
  link_destino: '',
  imagem: '',
  prioridade: 0,
  ativo: true,
};

const typeConfig: Record<string, { icon: typeof Gift; label: string }> = {
  oferta: { icon: Gift, label: 'Oferta' },
  sorteio: { icon: Ticket, label: 'Sorteio' },
  conquista: { icon: Award, label: 'Conquista' },
};

export const AdminCommunityHighlights = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<HighlightForm>(emptyForm);

  const { data: highlights, isLoading } = useQuery({
    queryKey: ['admin-community-highlights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_highlights')
        .select('*, businesses!community_highlights_business_id_fkey(name, logo_url)')
        .order('prioridade', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: businesses } = useQuery({
    queryKey: ['admin-businesses-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, logo_url')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Carrega ofertas ativas do anunciante selecionado
  const { data: businessOffers } = useQuery({
    queryKey: ['admin-business-offers', form.business_id],
    queryFn: async () => {
      if (!form.business_id) return [];
      const { data, error } = await supabase
        .from('offers')
        .select('id, title, image_url, valid_until')
        .eq('business_id', form.business_id)
        .eq('is_active', true)
        .gte('valid_until', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.business_id && form.tipo_destaque === 'oferta',
  });

  // Carrega sorteios ativos do anunciante selecionado
  const { data: businessRaffles } = useQuery({
    queryKey: ['admin-business-raffles', form.business_id],
    queryFn: async () => {
      if (!form.business_id) return [];
      const { data, error } = await supabase
        .from('raffles')
        .select('id, title, prize, image_url, end_date')
        .eq('business_id', form.business_id)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.business_id && form.tipo_destaque === 'sorteio',
  });

  // Carrega conquistas (badges) já desbloqueadas pelo anunciante
  const { data: businessAchievements } = useQuery({
    queryKey: ['admin-business-achievements', form.business_id],
    queryFn: async () => {
      if (!form.business_id) return [];
      const { data, error } = await supabase
        .from('business_achievements')
        .select('id, badge_id, earned_at, business_badges(id, name, description, icon, color, rarity)')
        .eq('business_id', form.business_id)
        .eq('is_unlocked', true)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!form.business_id && form.tipo_destaque === 'conquista',
  });

  // Auto-preenche os campos quando uma oferta é selecionada
  const selectOffer = (offerId: string) => {
    const offer = businessOffers?.find((o) => o.id === offerId);
    if (!offer) return;
    setForm({
      ...form,
      titulo: offer.title,
      link_destino: `/ofertas/${offer.id}`,
      imagem: offer.image_url || form.imagem,
    });
  };

  const selectRaffle = (raffleId: string) => {
    const raffle = businessRaffles?.find((r) => r.id === raffleId);
    if (!raffle) return;
    setForm({
      ...form,
      titulo: raffle.title,
      descricao_curta: raffle.prize ? `Prêmio: ${raffle.prize}` : '',
      link_destino: `/sorteios/${raffle.id}`,
      imagem: raffle.image_url || form.imagem,
    });
  };

  const selectAchievement = (achievementId: string) => {
    const ach: any = businessAchievements?.find((a: any) => a.id === achievementId);
    if (!ach?.business_badges) return;
    const badge = ach.business_badges;
    setForm({
      ...form,
      titulo: `${badge.icon || '🏅'} Conquista: ${badge.name}`,
      descricao_curta: badge.description || '',
      link_destino: '/comunidade',
    });
  };

  const saveMutation = useMutation({
    mutationFn: async (data: HighlightForm & { id?: string }) => {
      const payload = {
        ...data,
        business_id: data.business_id || null,
        created_by: user?.id,
      };
      if (data.id) {
        const { error } = await supabase
          .from('community_highlights')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('community_highlights')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['community-highlights'] });
      toast.success(editingId ? 'Destaque atualizado!' : 'Destaque criado!');
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error('Erro ao salvar destaque'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('community_highlights')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-highlights'] });
      toast.success('Destaque removido');
    },
    onError: () => toast.error('Erro ao remover'),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('community_highlights')
        .update({ ativo })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-community-highlights'] });
      queryClient.invalidateQueries({ queryKey: ['community-highlights'] });
    },
  });

  const openEdit = (h: any) => {
    setEditingId(h.id);
    setForm({
      business_id: h.business_id || '',
      tipo_destaque: h.tipo_destaque,
      titulo: h.titulo,
      descricao_curta: h.descricao_curta || '',
      link_destino: h.link_destino || '',
      imagem: h.imagem || '',
      prioridade: h.prioridade,
      ativo: h.ativo,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Destaques da Comunidade
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie ofertas, sorteios e conquistas em destaque no feed
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1" /> Novo Destaque
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Destaque' : 'Novo Destaque'}</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({ ...form, id: editingId || undefined });
              }}
            >
              <div>
                <Label>Tipo</Label>
                <Select value={form.tipo_destaque} onValueChange={(v) => setForm({ ...form, tipo_destaque: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oferta">🎁 Oferta</SelectItem>
                    <SelectItem value="sorteio">🎟️ Sorteio</SelectItem>
                    <SelectItem value="conquista">🏅 Conquista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Anunciante (opcional)</Label>
                <Select value={form.business_id || 'none'} onValueChange={(v) => setForm({ ...form, business_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar anunciante" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {businesses?.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor dinâmico baseado no tipo + anunciante */}
              {form.business_id && form.tipo_destaque === 'oferta' && (
                <div>
                  <Label>Selecionar Oferta existente</Label>
                  <Select onValueChange={selectOffer}>
                    <SelectTrigger>
                      <SelectValue placeholder={businessOffers?.length ? 'Escolha uma oferta...' : 'Sem ofertas ativas'} />
                    </SelectTrigger>
                    <SelectContent>
                      {businessOffers?.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Preenche título, link e imagem automaticamente.</p>
                </div>
              )}

              {form.business_id && form.tipo_destaque === 'sorteio' && (
                <div>
                  <Label>Selecionar Sorteio existente</Label>
                  <Select onValueChange={selectRaffle}>
                    <SelectTrigger>
                      <SelectValue placeholder={businessRaffles?.length ? 'Escolha um sorteio...' : 'Sem sorteios ativos'} />
                    </SelectTrigger>
                    <SelectContent>
                      {businessRaffles?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Preenche título, prêmio, link e imagem.</p>
                </div>
              )}

              {form.business_id && form.tipo_destaque === 'conquista' && (
                <div>
                  <Label>Selecionar Conquista do anunciante</Label>
                  <Select onValueChange={selectAchievement}>
                    <SelectTrigger>
                      <SelectValue placeholder={businessAchievements?.length ? 'Escolha uma conquista...' : 'Sem conquistas desbloqueadas'} />
                    </SelectTrigger>
                    <SelectContent>
                      {businessAchievements?.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.business_badges?.icon} {a.business_badges?.name} ({a.business_badges?.rarity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você pode editar título e descrição abaixo para personalizar.
                  </p>
                </div>
              )}
              <div>
                <Label>Título *</Label>
                <Input
                  required
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Mega promoção do mês"
                />
              </div>
              <div>
                <Label>Descrição curta</Label>
                <Textarea
                  value={form.descricao_curta}
                  onChange={(e) => setForm({ ...form, descricao_curta: e.target.value })}
                  placeholder="Breve descrição..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Link de destino</Label>
                  <Input
                    value={form.link_destino}
                    onChange={(e) => setForm({ ...form, link_destino: e.target.value })}
                    placeholder="/ofertas/id ou URL"
                  />
                </div>
                <div>
                  <Label>Prioridade</Label>
                  <Input
                    type="number"
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label>URL da imagem</Label>
                <Input
                  value={form.imagem}
                  onChange={(e) => setForm({ ...form, imagem: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label>Ativo</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Destaque'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : highlights && highlights.length > 0 ? (
        <div className="space-y-3">
          {highlights.map((h: any) => {
            const config = typeConfig[h.tipo_destaque] || typeConfig.oferta;
            const TypeIcon = config.icon;
            return (
              <Card key={h.id} className={`${!h.ativo ? 'opacity-50' : ''}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    {h.imagem ? (
                      <img src={h.imagem} className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <TypeIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className="text-xs">{config.label}</Badge>
                      <Badge variant={h.ativo ? 'default' : 'secondary'} className="text-xs">
                        {h.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" /> {h.prioridade}
                      </span>
                    </div>
                    <p className="font-medium text-sm truncate">{h.titulo}</p>
                    {h.businesses?.name && (
                      <p className="text-xs text-muted-foreground">{h.businesses.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Switch
                      checked={h.ativo}
                      onCheckedChange={(v) => toggleMutation.mutate({ id: h.id, ativo: v })}
                    />
                    <Button variant="ghost" size="icon" onClick={() => openEdit(h)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm('Remover este destaque?')) {
                          deleteMutation.mutate(h.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Star className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum destaque criado ainda</p>
            <Button variant="outline" className="mt-3" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Criar primeiro destaque
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
