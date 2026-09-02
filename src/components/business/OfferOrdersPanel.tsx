import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Check, X, Phone, ExternalLink, Loader2, Bike, QrCode } from 'lucide-react';
import { useBusinessOrders } from '@/hooks/useOfferOrders';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props { businessId: string }

export const OfferOrdersPanel = ({ businessId }: Props) => {
  const { orders, loading, confirm, cancel, confirmDelivery } = useBusinessOrders(businessId);
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(o =>
      o.consumer_name?.toLowerCase().includes(q) ||
      o.offer_title?.toLowerCase().includes(q) ||
      o.tx_code.toLowerCase().includes(q)
    );
  }, [orders, search]);

  const groups = {
    pendente: filtered.filter(o => o.status === 'pendente'),
    pago: filtered.filter(o => o.status === 'pago'),
    cancelado: filtered.filter(o => o.status === 'cancelado'),
  };

  const handleConfirm = async (id: string) => {
    setConfirmingId(id);
    await confirm(id);
    setConfirmingId(null);
  };

  const handleDelivery = async (id: string, offerId: string, consumerId: string) => {
    setDeliveringId(id);
    await confirmDelivery(offerId, consumerId);
    setDeliveringId(null);
  };


  const renderList = (list: typeof orders) => (
    <div className="space-y-2">
      {list.length === 0 && <p className="text-sm text-muted-foreground py-8 text-center">Nenhum pedido nesta categoria.</p>}
      {list.map(o => (
        <div key={o.id} className="border rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{o.consumer_name}</span>
              <Badge variant="outline" className="text-xs">R$ {Number(o.amount).toFixed(2)}</Badge>
              <Badge variant="secondary" className="text-xs">+{o.points_to_award} pts</Badge>
              {o.offer_is_delivery && (
                <Badge variant="outline" className="text-xs gap-1"><Bike className="w-3 h-3" /> Delivery</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {o.offer_title} · {o.tx_code}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(o.created_at), { locale: ptBR, addSuffix: true })}
              {o.consumer_phone && <> · <Phone className="inline w-3 h-3" /> {o.consumer_phone}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0 items-center">
            {o.status === 'pendente' && (
              <>
                {o.consumer_phone && (
                  <Button size="sm" variant="outline" asChild>
                    <a href={`https://wa.me/${o.consumer_phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" /> WhatsApp
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => cancel(o.id)}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={() => handleConfirm(o.id)} disabled={confirmingId === o.id}>
                  {confirmingId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Confirmar pago
                </Button>
              </>
            )}
            {o.status === 'pago' && <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">Pago</Badge>}
            {o.status === 'cancelado' && <Badge variant="destructive">Cancelado</Badge>}
            {o.offer_is_delivery && o.status !== 'cancelado' && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDelivery(o.id, o.offer_id, o.consumer_id)}
                disabled={deliveringId === o.id}
                className="bg-orange-500 hover:bg-orange-600 text-white border-none"
              >
                {deliveringId === o.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bike className="w-4 h-4 mr-1" />}
                Confirmar entrega e pontuar
              </Button>
            )}
          </div>

        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-emerald-500" />
          Pedidos PIX e Entregas
        </CardTitle>
        <CardDescription>Confirme pagamentos PIX ou entregas de delivery para pontuar seus clientes manualmente.</CardDescription>
      </CardHeader>
      <CardContent>
        <Input placeholder="Buscar por nome, oferta ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
        <Tabs defaultValue="pendente">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="pendente">Pendentes ({groups.pendente.length})</TabsTrigger>
            <TabsTrigger value="pago">Pagos ({groups.pago.length})</TabsTrigger>
            <TabsTrigger value="cancelado">Cancelados ({groups.cancelado.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="pendente" className="mt-3">{loading ? <Loader2 className="animate-spin mx-auto my-6" /> : renderList(groups.pendente)}</TabsContent>
          <TabsContent value="pago" className="mt-3">{renderList(groups.pago)}</TabsContent>
          <TabsContent value="cancelado" className="mt-3">{renderList(groups.cancelado)}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
