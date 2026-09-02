import React, { useState, useEffect } from 'react';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Gift, Trophy, Calendar, Star, Zap, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAutomaticRaffles } from '@/hooks/useAutomaticRaffles';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const MyRaffles = () => {
  const { user, isAuthenticated } = useAuth();
  const { getUserRaffleEntries, getAutomaticParticipations } = useAutomaticRaffles();
  const [raffleEntries, setRaffleEntries] = useState<any[]>([]);
  const [automaticParticipations, setAutomaticParticipations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserRaffleData();
    }
  }, [isAuthenticated, user]);

  const loadUserRaffleData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [entries, participations] = await Promise.all([
        getUserRaffleEntries(user.id),
        getAutomaticParticipations(user.id)
      ]);
      
      setRaffleEntries(entries);
      setAutomaticParticipations(participations);
    } catch (error) {
      console.error('Error loading raffle data:', error);
      toast.error('Erro ao carregar dados dos sorteios');
    } finally {
      setLoading(false);
    }
  };

  const getRaffleStatus = (raffle: any) => {
    if (!raffle) {
      return { status: 'Indisponível', variant: 'secondary' as const, icon: Calendar };
    }
    if (raffle.winner_id) {
      return { status: 'Finalizado', variant: 'default' as const, icon: Trophy };
    }
    if (!raffle.is_active) {
      return { status: 'Inativo', variant: 'secondary' as const, icon: Calendar };
    }
    if (new Date(raffle.end_date) < new Date()) {
      return { status: 'Expirado', variant: 'destructive' as const, icon: Calendar };
    }
    return { status: 'Ativo', variant: 'default' as const, icon: Gift };
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'checkin': return Star;
      case 'purchase': return Trophy;
      case 'like':
      case 'share': return Zap;
      case 'follow': return Gift;
      default: return Star;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'checkin': return 'Check-in';
      case 'purchase': return 'Compra';
      case 'like': return 'Curtida';
      case 'share': return 'Compartilhamento';
      case 'follow': return 'Seguir negócio';
      default: return action;
    }
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
          <h1 className="text-3xl font-bold mb-4">Faça login para ver seus sorteios</h1>
          <p className="text-muted-foreground mb-8">Entre na sua conta para acompanhar suas participações em sorteios.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to="/pontos" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Link>
            <h1 className="text-xl font-semibold">Meus Sorteios</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 pb-20">
        <Tabs defaultValue="participations" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="participations" className="text-xs sm:text-sm">
              Participações
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">
              Atividade Automática
            </TabsTrigger>
          </TabsList>

          <TabsContent value="participations" className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Sorteios que Participo</h2>
              <p className="text-muted-foreground">
                Acompanhe seus números da sorte e resultados
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando suas participações...</p>
              </div>
            ) : raffleEntries.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
                {raffleEntries.map((entry: any) => {
                  const raffle = entry.raffles;
                  const business = raffle?.businesses;
                  const statusInfo = getRaffleStatus(raffle);
                  const StatusIcon = statusInfo.icon;
                  const isWinner = raffle?.winner_id === user?.id;

                  return (
                    <Card key={entry.id} className={`border-0 shadow-card transition-all duration-300 ${isWinner ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
                          <div className="flex-1">
                            {raffle?.image_url && (
                              <img 
                                src={raffle.image_url} 
                                alt={raffle.title}
                                className="w-full h-32 sm:h-40 object-cover rounded-lg mb-4"
                              />
                            )}
                            
                            <div className="flex items-center gap-2 mb-2">
                              {business?.logo_url && (
                                <img 
                                  src={business.logo_url} 
                                  alt={business.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              )}
                              <span className="text-sm text-muted-foreground">
                                {business?.name || 'Negócio'}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{raffle?.title}</h3>
                            <p className="text-muted-foreground mb-3 line-clamp-3 text-sm">{raffle?.description}</p>
                            
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4 text-sm mb-4">
                              <span className="font-medium text-primary">
                                Prêmio: {raffle?.prize}
                              </span>
                              <span className="text-muted-foreground">
                                Até {new Date(raffle?.end_date).toLocaleDateString('pt-BR')}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Badge className="bg-gradient-points text-accent-foreground">
                                {entry.number_of_entries || 1} números da sorte
                              </Badge>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusInfo.status}
                              </Badge>
                              {isWinner && (
                                <Badge className="bg-gradient-primary">
                                  <Trophy className="w-3 h-3 mr-1" />
                                  GANHADOR!
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-card">
                <CardContent className="p-8 text-center">
                  <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Você ainda não participa de nenhum sorteio. Acumule pontos e participe!
                  </p>
                  <Button asChild className="mt-4 bg-gradient-primary">
                    <Link to="/pontos">Ver Sorteios Disponíveis</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Participação Automática</h2>
              <p className="text-muted-foreground">
                Histórico das suas ações que geraram participações automáticas
              </p>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando atividades...</p>
              </div>
            ) : automaticParticipations.length > 0 ? (
              <div className="space-y-4">
                {automaticParticipations.map((participation: any) => {
                  const ActionIcon = getActionIcon(participation.trigger_action);
                  const raffle = participation.raffles;
                  const business = raffle?.businesses;

                  return (
                    <Card key={participation.id} className="border-0 shadow-card">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-secondary rounded-full flex items-center justify-center flex-shrink-0">
                              <ActionIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium line-clamp-1 text-sm sm:text-base">
                                {getActionLabel(participation.trigger_action)} - {raffle?.title}
                              </p>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                {business?.name} • {new Date(participation.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                          <Badge className="bg-gradient-points text-accent-foreground flex-shrink-0 text-xs">
                            +{participation.entries_earned}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-0 shadow-card">
                <CardContent className="p-8 text-center">
                  <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Nenhuma participação automática ainda. Comece fazendo check-ins e interagindo com ofertas!
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default MyRaffles;