import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Gift, Trophy, Users, Loader2, ArrowLeft, Star, Filter, Zap } from 'lucide-react';
import { Countdown } from '@/components/Countdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAutomaticRaffles } from '@/hooks/useAutomaticRaffles';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

type AvailableRaffle = {
  id: string;
  title: string;
  description: string | null;
  prize: string;
  entry_cost: number;
  max_participants: number | null;
  current_participants: number;
  end_date: string;
  image_url: string | null;
  businesses: {
    name: string;
    logo_url?: string;
  };
};

const Raffles = () => {
  const { user, isAuthenticated } = useAuth();
  const { buyRaffleTicket } = useAutomaticRaffles();
  const [raffles, setRaffles] = useState<AvailableRaffle[]>([]);
  const [userEntriesByRaffle, setUserEntriesByRaffle] = useState<Record<string, { entryNumber: number; totalEntries: number }>>({});
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAllRaffles();
      loadUserPoints();
    }
  }, [isAuthenticated]);

  const loadAllRaffles = async () => {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select(`
          id,
          title,
          description,
          prize,
          entry_cost,
          max_participants,
          current_participants,
          end_date,
          image_url,
          businesses!inner (
            name,
            logo_url
          )
        `)
        .eq('is_active', true)
        .gt('end_date', new Date().toISOString())
        .order('end_date', { ascending: true });

      if (error) throw error;
      const rafflesData = (data as AvailableRaffle[]) || [];
      setRaffles(rafflesData);

      if (user && rafflesData.length > 0) {
        await loadUserRaffleEntries(rafflesData.map((raffle) => raffle.id));
      } else {
        setUserEntriesByRaffle({});
      }
    } catch (error) {
      console.error('Error loading raffles:', error);
      toast.error('Erro ao carregar sorteios');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPoints = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('total_points')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserPoints(data?.total_points || 0);
    } catch (error) {
      console.error('Error loading user points:', error);
    }
  };

  const loadUserRaffleEntries = async (raffleIds: string[]) => {
    if (!user || raffleIds.length === 0) {
      setUserEntriesByRaffle({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from('raffle_entries')
        .select('raffle_id, entry_number, number_of_entries')
        .eq('user_id', user.id)
        .in('raffle_id', raffleIds);

      if (error) throw error;

      const participationMap = (data || []).reduce((acc, entry) => {
        const current = acc[entry.raffle_id];
        const entryCount = entry.number_of_entries || 1;

        if (!current) {
          acc[entry.raffle_id] = {
            entryNumber: entry.entry_number,
            totalEntries: entryCount,
          };
          return acc;
        }

        acc[entry.raffle_id] = {
          entryNumber: current.entryNumber,
          totalEntries: current.totalEntries + entryCount,
        };

        return acc;
      }, {} as Record<string, { entryNumber: number; totalEntries: number }>);

      setUserEntriesByRaffle(participationMap);
    } catch (error) {
      console.error('Error loading raffle entries:', error);
      setUserEntriesByRaffle({});
    }
  };

  const handleBuyTicket = async (raffle: AvailableRaffle) => {
    if (!user) return;
    
    if (userPoints < raffle.entry_cost) {
      toast.error('Você não tem pontos suficientes para participar deste sorteio');
      return;
    }

    setPurchasing(raffle.id);
    try {
      const result = await buyRaffleTicket(raffle.id, user.id, raffle.entry_cost);
      
      if (result.success) {
        toast.success('Participação confirmada! Boa sorte!');
        await loadAllRaffles();
        await loadUserPoints();
      } else {
        throw new Error(result.error?.message || 'Erro ao participar do sorteio');
      }
    } catch (error: any) {
      console.error('Error buying ticket:', error);
      toast.error(error.message || 'Erro ao participar do sorteio');
    } finally {
      setPurchasing(null);
    }
  };

  // Detecta se um sorteio é imediato (data de encerramento > 50 anos no futuro)
  const isImmediateRaffle = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const yearsFromNow = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return yearsFromNow > 50;
  };

  const isRaffleAvailable = (raffle: AvailableRaffle) => {
    const hasSlots = !raffle.max_participants || raffle.current_participants < raffle.max_participants;
    // Sorteios imediatos nunca expiram
    const notExpired = isImmediateRaffle(raffle.end_date) || new Date(raffle.end_date) > new Date();
    return hasSlots && notExpired;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 py-4">
            <Navigation />
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Faça login para ver os sorteios</h1>
          <p className="text-muted-foreground mb-8">Entre na sua conta para participar dos sorteios disponíveis.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/pontos" className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-sm sm:text-base">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <h1 className="text-lg sm:text-xl font-semibold">Sorteios</h1>
            </div>
            <Badge className="bg-gradient-points text-accent-foreground text-xs sm:text-sm">
              {userPoints} pts
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-points text-accent-foreground py-8 sm:py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <Trophy className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto mb-3 sm:mb-4 animate-bounce" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4">
            Sorteios Disponíveis
          </h1>
          <p className="text-base sm:text-lg md:text-xl opacity-90 mb-4 sm:mb-6 max-w-md mx-auto">
            Use seus pontos para participar e concorrer a prêmios incríveis!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-1 sm:gap-2">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>{raffles.length} sorteios ativos</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Prêmios variados</span>
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-0 shadow-card animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded w-2/3 mb-4"></div>
                  <div className="h-10 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : raffles.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {raffles.map((raffle) => {
              const available = isRaffleAvailable(raffle);
              const participation = userEntriesByRaffle[raffle.id];
              
              return (
                <Link key={raffle.id} to={`/sorteios/${raffle.id}`}>
                  <Card className="border-0 shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden cursor-pointer h-full">
                    <div className="relative">
                    {raffle.image_url ? (
                      <img 
                        src={raffle.image_url} 
                        alt={raffle.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gradient-points flex items-center justify-center">
                        <Gift className="w-12 h-12 text-white" />
                      </div>
                    )}
                    
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-gradient-primary">
                        {isImmediateRaffle(raffle.end_date) ? (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            Imediato
                          </>
                        ) : (
                          <>
                            <Trophy className="w-3 h-3 mr-1" />
                            Ativo
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-3">
                      {raffle.businesses.logo_url && (
                        <img 
                          src={raffle.businesses.logo_url} 
                          alt={raffle.businesses.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {raffle.businesses.name}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg mb-3 line-clamp-2">{raffle.title}</h3>

                    {participation && (
                      <Badge variant="secondary" className="mb-3">
                        Participando • Nº {participation.entryNumber}
                      </Badge>
                    )}
                    <p className="text-muted-foreground mb-4 line-clamp-3 text-sm">
                      {raffle.description || `Concorra a ${raffle.prize}`}
                    </p>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Prêmio:</span>
                        <span className="font-semibold text-primary">{raffle.prize}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Custo:</span>
                        <span className="font-semibold">{raffle.entry_cost} pontos</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Participantes:</span>
                        <span className="font-semibold">
                          <Users className="w-4 h-4 inline mr-1" />
                          {raffle.current_participants}
                          {raffle.max_participants ? `/${raffle.max_participants}` : ''}
                        </span>
                      </div>
                      {isImmediateRaffle(raffle.end_date) ? (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Tipo:</span>
                          <span className="font-semibold text-primary flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Sorteio Imediato
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Encerra em:</span>
                          <Countdown endDate={raffle.end_date} variant="badge" />
                        </div>
                      )}
                    </div>

                    <Button
                      className="w-full bg-gradient-primary text-white"
                      size="lg"
                    >
                      {!available ? (
                        'Sorteio Esgotado'
                      ) : (
                        participation
                          ? 'Ver detalhes (Participando)'
                          : 'Ver Detalhes e Participar'
                      )}
                    </Button>
                  </CardContent>
                </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Gift className="w-24 h-24 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Nenhum sorteio disponível</h2>
            <p className="text-muted-foreground mb-8">
              Não há sorteios ativos no momento. Volte em breve para conferir novos prêmios!
            </p>
            <Button asChild className="bg-gradient-primary">
              <Link to="/pontos">Voltar aos Pontos</Link>
            </Button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Raffles;