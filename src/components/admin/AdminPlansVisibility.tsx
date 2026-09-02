import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Eye, EyeOff, Pencil, Loader2 } from 'lucide-react';

interface PlanRow {
  id: string;
  name: string;
  price_monthly: number;
  price_yearly: number | null;
  max_offers: number | null;
  max_raffles: number | null;
  max_views: number | null;
  monthly_points_allocation: number | null;
  checkout_url: string | null;
  features: any;
  is_visible: boolean;
}

const emptyEdit: Partial<PlanRow> = {};

export const AdminPlansVisibility: React.FC = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [form, setForm] = useState<Partial<PlanRow>>(emptyEdit);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['admin-plans-manager'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*');
      if (error) throw error;
      return ((data || []) as any[])
        .map((p) => ({ ...p, is_visible: p.is_visible !== false } as PlanRow))
        .sort((a, b) => {
          if (a.price_monthly === 0) return 1;
          if (b.price_monthly === 0) return -1;
          return a.price_monthly - b.price_monthly;
        });
    },
  });

  const callEdge = async (payload: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('admin-update-plan', {
      body: payload,
    });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data;
  };

  const toggleVisibility = useMutation({
    mutationFn: (vars: { id: string; is_visible: boolean }) =>
      callEdge({ action: 'update', id: vars.id, is_visible: vars.is_visible }),
    onSuccess: (_, vars) => {
      toast.success(vars.is_visible ? 'Plano ativado' : 'Plano ocultado');
      queryClient.invalidateQueries({ queryKey: ['admin-plans-manager'] });
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao atualizar plano'),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error('Nada para salvar');
      const featuresValue = typeof form.features === 'string'
        ? (form.features as string)
            .split('\n')
            .map((f) => f.trim())
            .filter(Boolean)
        : form.features;

      return callEdge({
        action: 'update',
        id: editing.id,
        name: form.name,
        price_monthly: Number(form.price_monthly ?? 0),
        price_yearly: form.price_yearly === null || form.price_yearly === undefined || (form.price_yearly as any) === ''
          ? null
          : Number(form.price_yearly),
        max_offers: form.max_offers === null || (form.max_offers as any) === '' ? null : Number(form.max_offers),
        max_raffles: form.max_raffles === null || (form.max_raffles as any) === '' ? null : Number(form.max_raffles),
        max_views: form.max_views === null || (form.max_views as any) === '' ? null : Number(form.max_views),
        monthly_points_allocation:
          form.monthly_points_allocation === null || (form.monthly_points_allocation as any) === ''
            ? null
            : Number(form.monthly_points_allocation),
        checkout_url: form.checkout_url || null,
        features: featuresValue,
        is_visible: !!form.is_visible,
      });
    },
    onSuccess: () => {
      toast.success('Plano atualizado com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-plans-manager'] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message || 'Erro ao salvar'),
  });

  const openEdit = (plan: PlanRow) => {
    setEditing(plan);
    const featuresText = Array.isArray(plan.features)
      ? plan.features.filter((f: any) => typeof f === 'string').join('\n')
      : '';
    setForm({
      name: plan.name,
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_offers: plan.max_offers,
      max_raffles: plan.max_raffles,
      max_views: plan.max_views,
      monthly_points_allocation: plan.monthly_points_allocation,
      checkout_url: plan.checkout_url ?? '',
      features: featuresText as any,
      is_visible: plan.is_visible,
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Gerenciar Planos</CardTitle>
          <CardDescription>
            Ative/desative planos, edite valores, limites, créditos e link de checkout.
            Planos ocultos continuam funcionando para quem já assinou.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : (
            plans?.map((plan) => (
              <div
                key={plan.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex items-start gap-3 min-w-0">
                  {plan.is_visible ? (
                    <Eye className="w-4 h-4 text-green-500 mt-1 shrink-0" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium flex flex-wrap items-center gap-2">
                      {plan.name}
                      <Badge variant={plan.is_visible ? 'default' : 'secondary'}>
                        {plan.is_visible ? 'Visível' : 'Oculto'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan.price_monthly === 0
                        ? 'A combinar'
                        : `R$ ${Number(plan.price_monthly).toFixed(2).replace('.', ',')}/mês`}
                      {plan.max_offers ? ` · ${plan.max_offers} ofertas` : ' · ofertas ilimitadas'}
                      {plan.max_raffles ? ` · ${plan.max_raffles} sorteios` : ' · sorteios ilimitados'}
                      {plan.monthly_points_allocation
                        ? ` · ${plan.monthly_points_allocation} créditos/mês`
                        : ''}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`vis-${plan.id}`} className="text-xs text-muted-foreground">
                      Ativo
                    </Label>
                    <Switch
                      id={`vis-${plan.id}`}
                      checked={plan.is_visible}
                      disabled={toggleVisibility.isPending}
                      onCheckedChange={(checked) =>
                        toggleVisibility.mutate({ id: plan.id, is_visible: checked })
                      }
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openEdit(plan)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Plano</DialogTitle>
            <DialogDescription>
              Atualize valores, limites e o link de checkout do plano.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={form.name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch
                  checked={!!form.is_visible}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_visible: checked }))}
                />
                <Label>Visível na página de planos</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Preço mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price_monthly ?? 0}
                  onChange={(e) => setForm((f) => ({ ...f, price_monthly: e.target.value as any }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Preço anual (R$) — opcional</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.price_yearly ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, price_yearly: e.target.value as any }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Máx. ofertas</Label>
                <Input
                  type="number"
                  placeholder="Vazio = ilimitado"
                  value={form.max_offers ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, max_offers: e.target.value as any }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Máx. sorteios</Label>
                <Input
                  type="number"
                  placeholder="Vazio = ilimitado"
                  value={form.max_raffles ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, max_raffles: e.target.value as any }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Máx. visualizações</Label>
                <Input
                  type="number"
                  placeholder="Vazio = ilimitado"
                  value={form.max_views ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, max_views: e.target.value as any }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Créditos mensais (IA)</Label>
                <Input
                  type="number"
                  value={form.monthly_points_allocation ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, monthly_points_allocation: e.target.value as any }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>URL de checkout (Cakto)</Label>
                <Input
                  placeholder="https://pay.cakto.com.br/..."
                  value={(form.checkout_url as string) ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, checkout_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Features (uma por linha)</Label>
              <Textarea
                rows={5}
                value={(form.features as any) ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, features: e.target.value as any }))}
                placeholder={'Suporte prioritário\nRelatórios avançados\n...'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saveEdit.isPending}>
              Cancelar
            </Button>
            <Button onClick={() => saveEdit.mutate()} disabled={saveEdit.isPending}>
              {saveEdit.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminPlansVisibility;
