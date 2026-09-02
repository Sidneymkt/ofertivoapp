import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { CreditCard, Calendar, Shield, Loader2, AlertTriangle } from 'lucide-react';

interface AdminManageSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: {
    id: string;
    name: string;
    is_active: boolean;
    owner_id: string;
  } | null;
}

export const AdminManageSubscriptionDialog = ({ open, onOpenChange, business }: AdminManageSubscriptionDialogProps) => {
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [activateBusiness, setActivateBusiness] = useState(true);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch plans
  const { data: plans } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, price_monthly, max_offers, max_raffles')
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch current subscription
  const { data: currentSub, isLoading: subLoading } = useQuery({
    queryKey: ['admin-business-subscription', business?.id],
    queryFn: async () => {
      if (!business?.id) return null;
      const { data, error } = await supabase
        .from('business_subscriptions')
        .select('*, subscription_plans(name, max_offers, max_raffles)')
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!business?.id && open,
  });

  useEffect(() => {
    if (currentSub?.plan_id) {
      setSelectedPlanId(currentSub.plan_id);
    }
  }, [currentSub]);

  const selectedPlan = plans?.find(p => p.id === selectedPlanId);

  const handleSubmit = async () => {
    if (!business || !selectedPlanId) {
      toast.error('Selecione um plano');
      return;
    }

    const businessId = business.id?.trim();
    const ownerId = business.owner_id?.trim();
    const parsedValidityDays = Number.parseInt(validityDays, 10);

    if (!businessId || !ownerId) {
      toast.error('Negócio inválido para ativação manual');
      return;
    }

    if (!Number.isFinite(parsedValidityDays) || parsedValidityDays < 1) {
      toast.error('Informe uma validade válida em dias');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        action: 'activate',
        businessId,
        ownerId,
        planId: selectedPlanId,
        validityDays: parsedValidityDays,
        activateBusiness,
        reason: reason.trim() || null,
      };
      console.log('[ManageSubscription] Sending payload:', JSON.stringify(payload));

      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: payload,
      });

      if (error) {
        // Try to extract the actual error message from the response
        let errorMessage = error.message || 'Erro desconhecido';
        if (error.context && typeof error.context === 'object') {
          try {
            const responseBody = await (error.context as Response).json?.();
            if (responseBody?.error) {
              errorMessage = responseBody.error;
            }
          } catch {
            // ignore parse errors
          }
        }
        console.error('[ManageSubscription] Edge function error:', errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (!data?.success) {
        const msg = data?.error || 'Falha ao ativar plano';
        console.error('[ManageSubscription] Activation failed:', msg);
        toast.error(msg);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-business-subscription'] });

      toast.success(`Plano ${selectedPlan?.name} ativado para ${business.name}!`);
      onOpenChange(false);
      setReason('');
    } catch (error: any) {
      console.error('[ManageSubscription] Unexpected error:', error);
      toast.error(error.message || 'Erro ao gerenciar assinatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateSubscription = async () => {
    if (!business || !currentSub?.id) return;

    const businessId = business.id?.trim();
    const ownerId = business.owner_id?.trim();

    if (!businessId || !ownerId) {
      toast.error('Negócio inválido para cancelamento');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-manage-subscription', {
        body: {
          action: 'cancel',
          businessId,
          ownerId,
          reason: reason.trim() || null,
        },
      });

      if (error) {
        let errorMessage = error.message || 'Erro desconhecido';
        if (error.context && typeof error.context === 'object') {
          try {
            const responseBody = await (error.context as Response).json?.();
            if (responseBody?.error) errorMessage = responseBody.error;
          } catch { /* ignore */ }
        }
        toast.error(errorMessage);
        return;
      }

      if (!data?.success) {
        toast.error(data?.error || 'Falha ao cancelar assinatura');
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      toast.success('Assinatura cancelada');
      onOpenChange(false);
    } catch (error: any) {
      console.error('[ManageSubscription] Cancel error:', error);
      toast.error(error.message || 'Erro ao cancelar assinatura');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!business) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Gerenciar Plano - {business.name}
          </DialogTitle>
          <DialogDescription>
            Altere o plano, validade ou bloqueie acesso do anunciante.
          </DialogDescription>
        </DialogHeader>

        {subLoading ? (
          <div className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Status */}
            {currentSub ? (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Plano Atual</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={currentSub.status === 'active' ? 'default' : 'destructive'}>
                    {(currentSub.subscription_plans as any)?.name || 'N/A'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentSub.status === 'active' ? '✅ Ativo' : `⚠️ ${currentSub.status}`}
                  </Badge>
                  {currentSub.current_period_end && (
                    <span className="text-xs text-muted-foreground">
                      Até {new Date(currentSub.current_period_end).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                {currentSub.payment_gateway && (
                  <p className="text-xs text-muted-foreground">
                    Gateway: {currentSub.payment_gateway}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-600">Sem Assinatura</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Este anunciante não possui nenhum plano ativo.</p>
              </div>
            )}

            <Separator />

            {/* Plan Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Plano
              </Label>
              <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - R$ {plan.price_monthly}/mês 
                      ({plan.max_offers === null ? '∞' : plan.max_offers} ofertas, {plan.max_raffles === null ? '∞' : plan.max_raffles} sorteios)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Validity */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Validade (dias)
              </Label>
              <Input
                type="number"
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
                min="1"
                max="365"
              />
              <p className="text-xs text-muted-foreground">
                Válido até: {new Date(Date.now() + parseInt(validityDays || '30') * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {/* Activate Business */}
            {!business.is_active && (
              <div className="flex items-center justify-between">
                <Label>Ativar negócio automaticamente</Label>
                <Switch checked={activateBusiness} onCheckedChange={setActivateBusiness} />
              </div>
            )}

            {/* Reason */}
            <div className="space-y-2">
              <Label>Motivo / Observação (opcional)</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Pagamento confirmado via PIX, cortesia, etc."
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {currentSub?.status === 'active' && (
            <Button
              variant="destructive"
              onClick={handleDeactivateSubscription}
              disabled={isSubmitting}
              className="sm:mr-auto"
            >
              Cancelar Assinatura
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedPlanId}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              currentSub ? 'Atualizar Plano' : 'Ativar Plano'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};