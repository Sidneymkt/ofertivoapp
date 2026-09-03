import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { UserCheck, Heart, Eye, Bell, Ticket, MessageCircle, Clock } from 'lucide-react';

interface TimelineEvent {
  id: string;
  type: 'checkin' | 'favorite' | 'view' | 'follow' | 'raffle' | 'message';
  date: string;
  title: string;
  subtitle?: string;
}

const ICONS: Record<TimelineEvent['type'], { icon: React.ReactNode; color: string }> = {
  checkin: { icon: <UserCheck className="w-3.5 h-3.5" />, color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  favorite: { icon: <Heart className="w-3.5 h-3.5" />, color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  view: { icon: <Eye className="w-3.5 h-3.5" />, color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  follow: { icon: <Bell className="w-3.5 h-3.5" />, color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  raffle: { icon: <Ticket className="w-3.5 h-3.5" />, color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  message: { icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
};

const TYPE_LABEL: Record<TimelineEvent['type'], string> = {
  checkin: 'Check-in',
  favorite: 'Favoritou',
  view: 'Visualizou',
  follow: 'Começou a seguir',
  raffle: 'Participou de sorteio',
  message: 'Mensagem',
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `há ${Math.floor(diff / 86400)}d`;
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export const LeadHistoryTimeline: React.FC<{ businessId: string; userId: string }> = ({ businessId, userId }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [checkinsRes, offersRes, followsRes, rafflesRes] = await Promise.all([
          supabase
            .from('offer_checkins')
            .select('id, created_at, offer_id, offers(title)')
            .eq('business_id', businessId).eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(50),
          supabase
            .from('offers')
            .select('id, title')
            .eq('business_id', businessId),
          supabase
            .from('follows')
            .select('created_at')
            .eq('business_id', businessId).eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(5),
          supabase
            .from('raffle_entries')
            .select('id, created_at, raffle_id, raffles(title, business_id)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }).limit(50),
        ]);

        const offerIds = (offersRes.data || []).map(o => o.id);
        const offerTitleMap = new Map<any, any>((offersRes.data || []).map(o => [o.id, o.title]));

        const [favRes, viewRes] = offerIds.length ? await Promise.all([
          supabase.from('favorites')
            .select('offer_id, created_at')
            .eq('user_id', userId).in('offer_id', offerIds)
            .order('created_at', { ascending: false }).limit(50),
          supabase.from('offer_views')
            .select('id, offer_id, created_at')
            .eq('user_id', userId).in('offer_id', offerIds)
            .order('created_at', { ascending: false }).limit(50),
        ]) : [{ data: [] as any[] }, { data: [] as any[] }];

        const out: TimelineEvent[] = [];

        (checkinsRes.data || []).forEach((c: any) => out.push({
          id: `c-${c.id}`, type: 'checkin', date: c.created_at,
          title: 'Fez check-in',
          subtitle: c.offers?.title || 'Oferta',
        }));
        (favRes.data || []).forEach((f: any, i: number) => out.push({
          id: `f-${f.offer_id}-${i}`, type: 'favorite', date: f.created_at,
          title: 'Favoritou oferta',
          subtitle: offerTitleMap.get(f.offer_id) || 'Oferta',
        }));
        (viewRes.data || []).forEach((v: any) => out.push({
          id: `v-${v.id}`, type: 'view', date: v.created_at,
          title: 'Visualizou oferta',
          subtitle: offerTitleMap.get(v.offer_id) || 'Oferta',
        }));
        (followsRes.data || []).forEach((f: any, i: number) => out.push({
          id: `fo-${i}`, type: 'follow', date: f.created_at,
          title: 'Começou a seguir o negócio',
        }));
        (rafflesRes.data || []).forEach((r: any) => {
          if (r.raffles?.business_id === businessId) {
            out.push({
              id: `r-${r.id}`, type: 'raffle', date: r.created_at,
              title: 'Participou de sorteio',
              subtitle: r.raffles?.title || 'Sorteio',
            });
          }
        });

        out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (!cancelled) setEvents(out.slice(0, 60));
      } catch (e) {
        console.error('[LeadHistoryTimeline]', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [businessId, userId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-muted-foreground/60">
        <Clock className="w-8 h-8 mb-2" />
        <p className="text-xs">Nenhuma interação registrada ainda</p>
      </div>
    );
  }

  return (
    <div className="relative pl-4 max-h-[280px] overflow-y-auto pr-1">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border/60" />
      <ul className="space-y-3">
        {events.map(ev => {
          const cfg = ICONS[ev.type];
          return (
            <li key={ev.id} className="relative">
              <span className={`absolute -left-[13px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${cfg.color}`}>
                <span className="scale-[0.7]">{cfg.icon}</span>
              </span>
              <div className="ml-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-xs font-medium">{ev.title}</p>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatWhen(ev.date)}</span>
                </div>
                {ev.subtitle && (
                  <p className="text-[11px] text-muted-foreground truncate">{ev.subtitle}</p>
                )}
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground/60">{TYPE_LABEL[ev.type]}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
