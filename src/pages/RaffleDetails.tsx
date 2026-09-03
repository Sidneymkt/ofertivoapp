import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Navigation } from '@/components/ui/navigation';
import { BottomNavigation } from '@/components/ui/bottom-navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Gift, 
  Trophy, 
  Users, 
  Calendar, 
  Loader2, 
  ArrowLeft, 
  Coins,
  Clock,
  Building2,
  Star,
  Zap
} from 'lucide-react';
import { Countdown } from '@/components/Countdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRaffles } from '@/hooks/useRaffles';
import { toast } from 'sonner';
import { SEOHead } from '@/components/SEOHead';
import { ShareMenu } from '@/components/ShareMenu';

interface RaffleDetails {
  id: string;
  title: string;
  description: string | null;
  prize: string;
  entry_cost: number;
  max_participants: number | null;
  current_participants: number;
  start_date: string;
  end_date: string;
  image_url: string | null;
  is_active: boolean;
  business: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

const RaffleDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { enterRaffle, getUserRaffleEntries } = useRaffles();
  
  const [raffle, setRaffle] = useState<RaffleDetails | null>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [participating, setParticipating] = useState(false);
  const [userEntries, setUserEntries] = useState<any[]>([]);

  useEffect(() => {
    if (id && isAuthenticated) {
      loadRaffleDetails();
      loadUserPoints();
      loadUserEntries();
    }
  }, [id, isAuthenticated]);

  const loadRaffleDetails = async () => {
    if (!id) return;
    
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
          start_date,
          end_date,
          image_url,
          is_active,
          business:businesses!inner (
            id,
            name,
            logo_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setRaffle(data as unknown as RaffleDetails);
    } catch (error) {
      console.error('Error loading raffle details:', error);
      toast.error('Erro ao carregar detalhes do sorteio');
      navigate('/sorteios');
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

  const loadUserEntries = async () => {
    if (!id || !user) return;
    
    try {
      const { data, error } = await supabase
        .from('raffle_entries')
        .select('*')
        .eq('raffle_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUserEntries(data || []);
    } catch (error) {
      console.error('Error loading user entries:', error);
    }
  };

  const handleParticipate = async () => {
    if (!raffle || !user) return;
    
    if (userPoints < raffle.entry_cost) {
      toast.error('Você não tem pontos suficientes para participar');
      return;
    }

    setParticipating(true);
    try {
      const result = await enterRaffle(raffle.id, 1);
      
      if (result.success) {
        toast.success(hasParticipated ? 'Número extra adquirido! Boa sorte!' : 'Participação confirmada! Boa sorte!');
        await loadRaffleDetails();
        await loadUserPoints();
        await loadUserEntries();
      } else {
        const errorMsg = typeof result.error === 'string'
          ? result.error
          : result.error?.message || 'Erro ao participar do sorteio';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Error participating in raffle:', error);
      toast.error(error.message || 'Erro ao participar do sorteio');
    } finally {
      setParticipating(false);
    }
  };

  // Detecta se um sorteio é imediato (data de encerramento > 50 anos no futuro)
  const isImmediateRaffle = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const yearsFromNow = (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 365);
    return yearsFromNow > 50;
  };

  const isRaffleAvailable = () => {
    if (!raffle) return false;
    const hasSlots = !raffle.max_participants || raffle.current_participants < raffle.max_participants;
    // Sorteios imediatos nunca expiram
    const notExpired = isImmediateRaffle(raffle.end_date) || new Date(raffle.end_date) > new Date();
    const isActive = raffle.is_active;
    return hasSlots && notExpired && isActive;
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
          <h1 className="text-3xl font-bold mb-4">Faça login para ver os detalhes</h1>
          <p className="text-muted-foreground mb-8">Entre na sua conta para participar dos sorteios.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link to="/sorteios" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                Voltar
              </Link>
              <div className="h-6 bg-muted rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-64 bg-muted rounded-lg"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!raffle) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
          <div className="container mx-auto px-4 py-4">
            <Link to="/sorteios" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Voltar aos Sorteios
            </Link>
          </div>
        </header>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-3xl font-bold mb-4">Sorteio não encontrado</h1>
          <p className="text-muted-foreground mb-8">O sorteio que você está procurando não existe ou foi removido.</p>
          <Button asChild>
            <Link to="/sorteios">Ver Todos os Sorteios</Link>
          </Button>
        </div>
      </div>
    );
  }

  const available = isRaffleAvailable();
  const canParticipate = available && userPoints >= raffle.entry_cost;
  const hasParticipated = userEntries.length > 0;
  const totalUserEntries = userEntries.reduce((sum, entry) => sum + (entry.number_of_entries || 1), 0);
  const isEndingSoon = new Date(raffle.end_date).getTime() - Date.now() < 24 * 60 * 60 * 1000;
  const luckyNumbers = Array.from(new Set(userEntries.map((entry) => entry.entry_number).filter(Boolean)));

  return (
    <>
      <SEOHead
        title={raffle.title}
        description={raffle.description || `Participe do sorteio e concorra a: ${raffle.prize}. Custo: ${raffle.entry_cost} pontos. ${raffle.current_participants} participantes.`}
        image={raffle.image_url || undefined}
        type="article"
        url={`/sorteio/${raffle.id}`}
      />
      <div className="min-h-screen bg-background pb-20 md:pb-0">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link to="/sorteios" className="flex items-center gap-1 sm:gap-2 text-muted-foreground hover:text-foreground text-sm sm:text-base">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
              <h1 className="text-base sm:text-xl font-semibold truncate">Detalhes do Sorteio</h1>
            </div>
            <Badge className="bg-gradient-points text-accent-foreground text-xs sm:text-sm shrink-0">
              {userPoints} pts
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8">
        {/* Main Card */}
        <Card className="border-0 shadow-card overflow-hidden">
          {/* Image */}
          <div className="relative">
            {raffle.image_url ? (
              <img 
                src={raffle.image_url} 
                alt={raffle.title}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-64 bg-gradient-points flex items-center justify-center">
                <Gift className="w-16 h-16 text-white" />
              </div>
            )}
            
            <div className="absolute top-4 left-4">
              {raffle && isImmediateRaffle(raffle.end_date) ? (
                <Badge className="bg-gradient-primary">
                  <Zap className="w-3 h-3 mr-1" />
                  Sorteio Imediato
                </Badge>
              ) : (
                <Badge className={available ? "bg-green-600" : "bg-red-600"}>
                  <Trophy className="w-3 h-3 mr-1" />
                  {available ? 'Ativo' : 'Encerrado'}
                </Badge>
              )}
            </div>

            {isEndingSoon && available && (
              <div className="absolute top-4 right-4">
                <Badge variant="destructive">
                  <Clock className="w-3 h-3 mr-1" />
                  Encerrando em breve
                </Badge>
              </div>
            )}
          </div>

          <CardContent className="p-6">
            {/* Business Info */}
            <div className="flex items-center gap-3 mb-4">
              {raffle.business.logo_url && (
                <img 
                  src={raffle.business.logo_url} 
                  alt={raffle.business.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{raffle.business.name}</span>
              </div>
            </div>

            {/* Title and Description */}
            <h1 className="text-2xl font-bold mb-4">{raffle.title}</h1>
            {raffle.description && (
              <p className="text-muted-foreground mb-6">{raffle.description}</p>
            )}

            {/* Prize Section */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">
                  Prêmio
                </span>
              </div>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                {raffle.prize}
              </p>
            </div>

            {/* User Participation (if applicable) */}
            {hasParticipated && (
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">
                    Suas Participações
                  </span>
                </div>
                <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                  {totalUserEntries} números da sorte
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Número da sorte: #{luckyNumbers[0] ?? '---'}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Você já está participando deste sorteio!
                </p>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Coins className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Custo</p>
                <p className="font-bold text-lg">{raffle.entry_cost} pts</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Participantes</p>
                <p className="font-bold text-lg">
                  {raffle.current_participants}
                  {raffle.max_participants ? `/${raffle.max_participants}` : ''}
                </p>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Time info */}
            {raffle && isImmediateRaffle(raffle.end_date) ? (
              <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  <span className="font-medium">Sorteio Imediato</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  O sorteio será realizado pelo anunciante a qualquer momento
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Termina em {new Date(raffle.end_date).toLocaleDateString('pt-BR')}</span>
                </div>
                <Countdown endDate={raffle.end_date} variant="default" />
              </div>
            )}

            {/* Action Button */}
            {hasParticipated && available && (
              <Button
                variant="outline"
                className="w-full border-green-500 text-green-600 dark:text-green-400 mb-3 pointer-events-none"
                size="lg"
              >
                <Star className="w-4 h-4 mr-2 fill-green-500 text-green-500" />
                Participando ✓
              </Button>
            )}
            <Button
              onClick={handleParticipate}
              disabled={!canParticipate || participating}
              className={`w-full ${hasParticipated ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80' : 'bg-gradient-primary text-white'}`}
              size="lg"
            >
              {participating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : !available ? (
                'Sorteio Indisponível'
              ) : userPoints < raffle.entry_cost ? (
                `Precisa de ${raffle.entry_cost - userPoints} pontos`
              ) : hasParticipated ? (
                `Comprar +1 número (${raffle.entry_cost} pts)`
              ) : (
                'Participar do Sorteio'
              )}
            </Button>

            {canParticipate && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Ao participar, {raffle.entry_cost} pontos serão descontados do seu saldo
                {hasParticipated && ` • Você já tem ${totalUserEntries} número(s)`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Additional Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          <ShareMenu
            url={window.location.href}
            title={raffle.title}
            description={raffle.description || `Participe do sorteio e concorra a: ${raffle.prize}`}
            contentType="raffle"
            contentId={raffle.id}
            variant="outline"
            size="default"
          />
          <Button asChild variant="outline" className="flex-1">
            <Link to="/sorteios">Ver Todos os Sorteios</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/meus-sorteios">Meus Sorteios</Link>
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
    </>
  );
};

export default RaffleDetailsPage;