import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Pencil, Eye, MousePointer, Upload, Loader2, Search, Link as LinkIcon, ImageIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES } from '@/lib/categories';
import { toast } from 'sonner';

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string;
  cta_label: string | null;
  internal_link: string | null;
  external_link: string | null;
  priority: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  target_city: string | null;
  target_category: string | null;
  views_count: number;
  clicks_count: number;
}

const empty: Partial<Banner> = {
  title: '',
  subtitle: '',
  image_url: '',
  cta_label: 'Ver oferta',
  internal_link: '',
  external_link: '',
  priority: 0,
  is_active: true,
  target_city: '',
  target_category: '',
};

export const AdminSponsoredBanners: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Banner>>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [offerSearch, setOfferSearch] = useState('');
  const [offers, setOffers] = useState<Array<{ id: string; title: string; image_url: string | null; business?: { name: string } | null }>>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('addresses')
        .select('city')
        .not('city', 'is', null)
        .limit(1000);
      const uniq = Array.from(new Set(((data || []) as any[])
        .map((r) => (r.city || '').trim())
        .filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
      setCities(uniq.length ? uniq : ['Manaus']);
    })();
  }, []);

  const loadOffers = async (term = '') => {
    setLoadingOffers(true);
    let q = supabase
      .from('offers')
      .select('id, title, image_url, business:businesses(name)')
      .eq('is_active', true)
      .not('image_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(30);
    if (term.trim()) q = q.ilike('title', `%${term.trim()}%`);
    const { data, error } = await q;
    if (!error) setOffers((data || []) as any);
    setLoadingOffers(false);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error('Imagem muito grande (máx 8MB)');
      return;
    }
    setUploading(true);
    try {
      const { compressForCover } = await import('@/lib/imageCompression');
      const compressed = await compressForCover(file);
      const ext = (compressed.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `banners/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('marketing-media')
        .upload(path, compressed, { cacheControl: '3600', upsert: false, contentType: compressed.type });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from('marketing-media').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: publicUrl }));
      toast.success('Imagem enviada!');
    } catch (e: any) {
      toast.error('Erro no upload: ' + e.message);
    } finally {
      setUploading(false);
    }
  };


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sponsored_banners' as any)
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar banners');
    else setBanners((data || []) as any);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!form.title || !form.image_url) {
      toast.error('Título e imagem são obrigatórios');
      return;
    }
    const payload: any = {
      title: form.title,
      subtitle: form.subtitle || null,
      image_url: form.image_url,
      cta_label: form.cta_label || 'Ver oferta',
      internal_link: form.internal_link || null,
      external_link: form.external_link || null,
      priority: Number(form.priority ?? 0),
      is_active: !!form.is_active,
      target_city: form.target_city || null,
      target_category: form.target_category || null,
      starts_at: form.starts_at || new Date().toISOString(),
      ends_at: form.ends_at || null,
    };
    if (editingId) {
      const { error } = await supabase.from('sponsored_banners' as any).update(payload).eq('id', editingId);
      if (error) return toast.error('Erro ao salvar: ' + error.message);
      toast.success('Banner atualizado');
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      payload.created_by = user?.id;
      const { error } = await supabase.from('sponsored_banners' as any).insert(payload);
      if (error) return toast.error('Erro ao criar: ' + error.message);
      toast.success('Banner criado');
    }
    setOpen(false);
    setForm(empty);
    setEditingId(null);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este banner?')) return;
    const { error } = await supabase.from('sponsored_banners' as any).delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Banner removido');
    load();
  };

  const toggleActive = async (b: Banner) => {
    const { error } = await supabase.from('sponsored_banners' as any).update({ is_active: !b.is_active }).eq('id', b.id);
    if (error) return toast.error(error.message);
    load();
  };

  const openEdit = (b: Banner) => {
    setEditingId(b.id);
    setForm(b);
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Banners Patrocinados</CardTitle>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditingId(null); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Novo banner</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Editar' : 'Novo'} banner</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div><Label>Título *</Label><Input value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Subtítulo</Label><Textarea rows={2} value={form.subtitle || ''} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Imagem do banner *</Label>
                {form.image_url && (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover" />
                    <Button type="button" size="sm" variant="destructive" className="absolute top-2 right-2"
                      onClick={() => setForm({ ...form, image_url: '' })}>Remover</Button>
                  </div>
                )}
                <Tabs defaultValue="upload" onValueChange={(v) => { if (v === 'offer' && offers.length === 0) loadOffers(); }}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="upload"><Upload className="w-3.5 h-3.5 mr-1" />Enviar</TabsTrigger>
                    <TabsTrigger value="offer"><ImageIcon className="w-3.5 h-3.5 mr-1" />Usar oferta</TabsTrigger>
                    <TabsTrigger value="url"><LinkIcon className="w-3.5 h-3.5 mr-1" />URL</TabsTrigger>
                  </TabsList>
                  <TabsContent value="upload" className="mt-2">
                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer hover:bg-muted/50 transition">
                      {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                      <span className="text-sm text-muted-foreground">{uploading ? 'Enviando...' : 'Clique para escolher (JPG/PNG/WEBP, até 8MB)'}</span>
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }} />
                    </label>
                  </TabsContent>
                  <TabsContent value="offer" className="mt-2 space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="Buscar oferta pelo título..." className="pl-8"
                        value={offerSearch}
                        onChange={(e) => setOfferSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadOffers(offerSearch); } }} />
                    </div>
                    <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2">
                      {loadingOffers ? (
                        <div className="col-span-2 flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
                      ) : offers.length === 0 ? (
                        <p className="col-span-2 text-xs text-muted-foreground text-center py-4">Nenhuma oferta encontrada.</p>
                      ) : offers.map((o) => (
                        <button key={o.id} type="button"
                          onClick={() => { setForm((f) => ({ ...f, image_url: o.image_url!, title: f.title || o.title, internal_link: f.internal_link || `/ofertas/${o.id}` })); toast.success('Imagem da oferta aplicada'); }}
                          className="text-left border rounded-lg overflow-hidden hover:ring-2 hover:ring-primary transition">
                          <img src={o.image_url!} alt={o.title} className="w-full h-20 object-cover" />
                          <div className="p-1.5">
                            <p className="text-xs font-medium truncate">{o.title}</p>
                            {o.business?.name && <p className="text-[10px] text-muted-foreground truncate">{o.business.name}</p>}
                          </div>
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                  <TabsContent value="url" className="mt-2">
                    <Input value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                  </TabsContent>
                </Tabs>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Texto do botão</Label><Input value={form.cta_label || ''} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
                <div><Label>Prioridade</Label><Input type="number" value={form.priority ?? 0} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Link interno (ex: /ofertas/abc)</Label><Input value={form.internal_link || ''} onChange={(e) => setForm({ ...form, internal_link: e.target.value })} /></div>
              <div><Label>Link externo</Label><Input value={form.external_link || ''} onChange={(e) => setForm({ ...form, external_link: e.target.value })} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cidade (segmentação)</Label>
                  <Select
                    value={form.target_city || '__all__'}
                    onValueChange={(v) => setForm({ ...form, target_city: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Todas as cidades" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as cidades</SelectItem>
                      {cities.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria (segmentação)</Label>
                  <Select
                    value={form.target_category || '__all__'}
                    onValueChange={(v) => setForm({ ...form, target_category: v === '__all__' ? '' : v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todas as categorias</SelectItem>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início da exibição (agendar)</Label>
                  <Input
                    type="datetime-local"
                    value={form.starts_at ? String(form.starts_at).slice(0,16) : ''}
                    onChange={(e) => setForm({ ...form, starts_at: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Deixe em branco para publicar agora.</p>
                </div>
                <div>
                  <Label>Expiração (fim da exibição)</Label>
                  <Input type="datetime-local" value={form.ends_at ? String(form.ends_at).slice(0,16) : ''} onChange={(e) => setForm({ ...form, ends_at: e.target.value ? new Date(e.target.value).toISOString() : null })} />
                  <div className="flex flex-wrap gap-1 mt-2">
                    {[
                      { label: '+1 dia', days: 1 },
                      { label: '+7 dias', days: 7 },
                      { label: '+15 dias', days: 15 },
                      { label: '+30 dias', days: 30 },
                    ].map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => {
                          const base = form.starts_at ? new Date(form.starts_at) : new Date();
                          const end = new Date(base.getTime() + p.days * 24 * 60 * 60 * 1000);
                          setForm({ ...form, ends_at: end.toISOString() });
                        }}
                      >
                        {p.label}
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setForm({ ...form, ends_at: null })}
                    >
                      Sem expiração
                    </Button>
                  </div>
                  {form.ends_at && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Expira em {new Date(form.ends_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativo</Label></div>
              <Button onClick={handleSave}>{editingId ? 'Salvar alterações' : 'Criar banner'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum banner cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.id} className="flex gap-3 border rounded-lg p-3 items-center">
                <img src={b.image_url} alt={b.title} className="w-24 h-16 object-cover rounded" />
                <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{b.title}</p>
                    <Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Ativo' : 'Inativo'}</Badge>
                    <Badge variant="outline">Prioridade {b.priority}</Badge>
                    {b.starts_at && new Date(b.starts_at) > new Date() && (
                      <Badge variant="outline" className="border-amber-500 text-amber-600">
                        Agendado {new Date(b.starts_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </Badge>
                    )}
                    {b.ends_at && new Date(b.ends_at) < new Date() && (
                      <Badge variant="outline" className="border-destructive text-destructive">Expirado</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>
                  <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{b.views_count}</span>
                    <span className="flex items-center gap-1"><MousePointer className="w-3 h-3" />{b.clicks_count}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Switch checked={b.is_active} onCheckedChange={() => toggleActive(b)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(b)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminSponsoredBanners;
