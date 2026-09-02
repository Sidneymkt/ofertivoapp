import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Crown, Medal, Star, Gift, Ticket, Award, ChevronRight, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Highlight {
  id: string;
  business_id: string | null;
  tipo_destaque: string;
  titulo: string;
  descricao_curta: string | null;
  link_destino: string | null;
  imagem: string | null;
  prioridade: number;
  businesses?: { name: string; logo_url: string | null; slug: string | null } | null;
}

interface WeeklyRank {
  id: string;
  business_id: string;
  posicao: number;
  score: number;
  ofertas_criadas: number;
  cliques: number;
  pontos_movimentados: number;
  interacoes: number;
  sorteios_ativos: number;
  businesses?: { name: string; logo_url: string | null; slug: string | null } | null;
}

const positionIcons = [
  { icon: Crown, color: 'text-yellow-500' },
  { icon: Medal, color: 'text-gray-400' },
  { icon: Medal, color: 'text-amber-600' },
];

const typeConfig: Record<string, { icon: typeof Gift; label: string; color: string }> = {
  oferta: { icon: Gift, label: 'Oferta', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  sorteio: { icon: Ticket, label: 'Sorteio', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  conquista: { icon: Award, label: 'Conquista', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
};

export const CommunityEliteSidebar = ({ compact = false }: { compact?: boolean }) => {
  const navigate = useNavigate();

  const { data: highlights, isLoading: loadingHighlights } = useQuery({
    queryKey: ['community-highlights'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_highlights')
        .select('*, businesses!community_highlights_business_id_fkey(name, logo_url, slug)')
        .eq('ativo', true)
        .order('prioridade', { ascending: false })
        .limit(3);
      if (error) throw error;
      return (data || []) as Highlight[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: ranking, isLoading: loadingRanking } = useQuery({
    queryKey: ['community-weekly-ranking'],
    queryFn: async () => {
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      const weekStart = monday.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('community_weekly_ranking')
        .select('*, businesses!community_weekly_ranking_business_id_fkey(name, logo_url, slug)')
        .eq('semana_inicio', weekStart)
        .order('posicao', { ascending: true })
        .limit(3);
      if (error) throw error;
      return (data || []) as WeeklyRank[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleHighlightClick = (h: Highlight) => {
    if (h.link_destino) {
      if (h.link_destino.startsWith('http')) {
        window.open(h.link_destino, '_blank');
      } else {
        navigate(h.link_destino);
      }
    }
  };

  const hasContent = (highlights && highlights.length > 0) || (ranking && ranking.length > 0);
  const isLoading = loadingHighlights || loadingRanking;

  if (!isLoading && !hasContent) return null;

  return (
    <div className={`space-y-4 ${compact ? '' : 'sticky top-20'}`}>
      {/* Weekly Ranking */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <span>⭐ Elite do Bairro</span>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Ranking da Semana</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingRanking ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))
          ) : ranking && ranking.length > 0 ? (
            <>
              {ranking.map((r, i) => {
                const PosIcon = positionIcons[i]?.icon || Star;
                const posColor = positionIcons[i]?.color || 'text-muted-foreground';
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => r.businesses?.slug && navigate(`/loja/${r.businesses.slug}`)}
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.businesses?.logo_url || ''} />
                        <AvatarFallback className="text-xs">
                          {r.businesses?.name?.charAt(0) || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <PosIcon className={`absolute -top-1 -right-1 h-4 w-4 ${posColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{r.businesses?.name || 'Negócio'}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 text-orange-500" />
                        <span>{r.score.toLocaleString()} pts</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs px-1.5">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
                    </Badge>
                  </div>
                );
              })}
            </>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              Ranking será atualizado em breve
            </p>
          )}
        </CardContent>
      </Card>

      {/* Highlights */}
      {(loadingHighlights || (highlights && highlights.length > 0)) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              🏆 Mural dos Campeões
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingHighlights ? (
              Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))
            ) : (
              highlights?.map((h) => {
                const config = typeConfig[h.tipo_destaque] || typeConfig.oferta;
                const TypeIcon = config.icon;
                return (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 hover:border-primary/30 hover:bg-muted/30 cursor-pointer transition-all"
                    onClick={() => handleHighlightClick(h)}
                  >
                    {h.imagem ? (
                      <img src={h.imagem} alt="" className="h-10 w-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <TypeIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${config.color}`}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium truncate">{h.titulo}</p>
                      {h.descricao_curta && (
                        <p className="text-xs text-muted-foreground truncate">{h.descricao_curta}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
