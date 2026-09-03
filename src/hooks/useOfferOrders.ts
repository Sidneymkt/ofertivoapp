import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OfferOrder {
  id: string;
  offer_id: string;
  business_id: string;
  consumer_id: string;
  amount: number;
  points_to_award: number;
  status: 'pendente' | 'pago' | 'cancelado';
  tx_code: string;
  consumer_phone: string | null;
  crm_lead_id: string | null;
  confirmed_at: string | null;
  created_at: string;
  pix_key_snapshot: any;
}

export const useBusinessOrders = (businessId?: string) => {
  const [orders, setOrders] = useState<(OfferOrder & { consumer_name?: string; offer_title?: string; offer_is_delivery?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!businessId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('offer_orders')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) { console.error(error); setLoading(false); return; }

    const list = (data || []) as OfferOrder[];
    const userIds = [...new Set(list.map(o => o.consumer_id))];
    const offerIds = [...new Set(list.map(o => o.offer_id))];

    const [{ data: profiles }, { data: offers }] = await Promise.all([
      userIds.length ? supabase.from('profiles').select('user_id, full_name, phone').in('user_id', userIds) : Promise.resolve({ data: [] as any[] }),
      offerIds.length ? supabase.from('offers').select('id, title, is_delivery').in('id', offerIds) : Promise.resolve({ data: [] as any[] }),
    ]);

    const pMap = new Map<any, any>((profiles || []).map((p: any) => [p.user_id, p]));
    const oMap = new Map<any, any>((offers || []).map((o: any) => [o.id, o]));

    setOrders(list.map(o => ({
      ...o,
      consumer_name: pMap.get(o.consumer_id)?.full_name || 'Consumidor',
      offer_title: oMap.get(o.offer_id)?.title || 'Oferta',
      offer_is_delivery: !!oMap.get(o.offer_id)?.is_delivery,
    })));
    setLoading(false);
  }, [businessId]);


  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    if (!businessId) return;
    const ch = supabase
      .channel(`offer_orders_${businessId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'offer_orders', filter: `business_id=eq.${businessId}` }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [businessId, fetch]);

  const confirm = useCallback(async (orderId: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('confirm_offer_order' as any, {
        p_order_id: orderId,
        p_ip: null,
        p_user_agent: navigator.userAgent,
      });
      if (error) throw error;
      toast.success('Pagamento confirmado! Pontos creditados ao consumidor.');
      await fetch();
      return data;
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao confirmar: ' + (e.message || ''));
    }
  }, [fetch]);

  const cancel = useCallback(async (orderId: string) => {
    const { error } = await (supabase as any)
      .from('offer_orders')
      .update({ status: 'cancelado' })
      .eq('id', orderId);
    if (error) { toast.error('Erro ao cancelar'); return; }
    toast.success('Pedido cancelado');
    await fetch();
  }, [fetch]);

  /** Modo delivery: confirma a entrega e credita os pontos automaticamente ao cliente */
  const confirmDelivery = useCallback(async (offerId: string, consumerId: string) => {
    try {
      const { data, error } = await (supabase as any).rpc('confirm_delivery_checkin' as any, {
        p_offer_id: offerId,
        p_user_id: consumerId,
      });
      if (error) throw error;
      const res = data as { success: boolean; message: string; points_awarded?: number; already_validated?: boolean };
      if (!res?.success) {
        toast.error(res?.message || 'Não foi possível pontuar o cliente');
        return res;
      }
      toast.success(res.already_validated
        ? 'Entrega já confirmada hoje; nenhuma pontuação foi duplicada.'
        : `Entrega confirmada! +${res.points_awarded ?? 0} pontos creditados ao cliente.`);
      window.dispatchEvent(new CustomEvent('checkinValidated', {
        detail: { offerId, pointsAwarded: res.points_awarded ?? 0 },
      }));
      await fetch();
      return res;
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao confirmar entrega: ' + (e?.message || ''));
    }
  }, [fetch]);

  return { orders, loading, refresh: fetch, confirm, cancel, confirmDelivery };
};


export async function createOfferOrder(input: {
  offerId: string;
  amount: number;
  pointsToAward: number;
  consumerPhone?: string;
}): Promise<OfferOrder | null> {
  const { data: userRes } = await (supabase as any).auth.getUser();
  const user = userRes?.user;
  if (!user) { toast.error('Faça login para comprar'); return null; }

  const { data, error } = await (supabase as any).rpc('create_offer_pix_order' as any, {
    p_offer_id: input.offerId,
    p_amount: input.amount,
    p_points_to_award: input.pointsToAward,
    p_consumer_phone: input.consumerPhone || null,
  });

  if (error) {
    console.error(error);
    toast.error('Erro ao criar pedido: ' + error.message);
    return null;
  }
  return data as OfferOrder;
}
