import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Gift,
  Calendar,
  Coins,
  ExternalLink,
  Trophy,
  Users,
  Clock
} from 'lucide-react';
import { useRaffles } from '@/hooks/useRaffles';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AvailableRafflesProps {
  className?: string;
}

export const AvailableRaffles: React.FC<AvailableRafflesProps> = ({
  className
}) => {
  const { user } = useAuth();
  const { activeRaffles, loading, getUserRaffleEntries } = useRaffles();
  const showMyEntries = true;

  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Sorteios Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-green-600" />
            Sorteios Disponíveis
          </CardTitle>
          {showMyEntries && (
            <Link to="/meus-sorteios">
              <Button 
                size="default" 
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 font-semibold"
              >
                <Trophy className="h-4 w-4 mr-2" />
                Meus Sorteios
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {activeRaffles && activeRaffles.length > 0 ? (
          <div className="space-y-4">
            {activeRaffles.slice(0, 3).map((raffle) => {
              const userEntries = showMyEntries ? getUserRaffleEntries(raffle.id) : null;
              const endDate = new Date(raffle.end_date);
              const isEndingSoon = endDate.getTime() - Date.now() < 24 * 60 * 60 * 1000; // Less than 24h
              
              return (
                <div
                  key={raffle.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors space-y-3"
                >
                  {/* Header with image */}
                  <div className="flex items-start gap-3">
                    {/* Raffle thumbnail */}
                    <div className="shrink-0">
                      {raffle.image_url ? (
                        <img 
                          src={raffle.image_url} 
                          alt={raffle.title}
                          className="w-14 h-14 rounded-lg object-cover border"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center border">
                          <Gift className="h-6 w-6 text-green-600" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 flex-1 min-w-0">
                          <h4 className="font-semibold text-sm leading-tight truncate">
                            {raffle.title}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {raffle.business?.name || 'Empresa'}
                          </p>
                        </div>
                        {isEndingSoon && (
                          <Badge variant="destructive" className="text-xs shrink-0">
                            <Clock className="h-3 w-3 mr-1" />
                            Encerrando
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Prize */}
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-green-600" />
                      <span className="text-xs font-medium text-green-800 dark:text-green-200">
                        Prêmio
                      </span>
                    </div>
                    <p className="font-semibold text-green-900 dark:text-green-100 text-sm">
                      {raffle.prize}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Coins className="h-3 w-3" />
                        <span>{raffle.entry_cost} pts</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{raffle.current_participants || 0} participantes</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Até {endDate.toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* User entries (if applicable) */}
                  {showMyEntries && userEntries && userEntries.length > 0 && (
                    <>
                      <Separator />
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-1">
                          <Trophy className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                            Suas Participações
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                            {userEntries.reduce((sum, entry) => sum + (entry.number_of_entries || 1), 0)} números da sorte
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            Sem pontos
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Action */}
                  <div className="flex gap-2">
                    <Link to={`/sorteios/${raffle.id}`} className="flex-1">
                      <Button 
                        size="sm" 
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Gift className="h-4 w-4 mr-2" />
                        {userEntries && userEntries.length > 0 ? 'Ver Detalhes' : 'Participar'}
                      </Button>
                    </Link>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(`/sorteios/${raffle.id}`, '_blank')}
                      title="Abrir em nova aba"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* Always show "Ver todos os sorteios" button */}
            <Separator />
            <Link to="/sorteios">
              <Button variant="secondary" className="w-full bg-accent text-accent-foreground hover:bg-accent/80" size="sm">
                <Gift className="h-4 w-4 mr-2" />
                Ver Todos os Sorteios
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Gift className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Nenhum sorteio disponível</p>
            <p className="text-sm">
              Novos sorteios aparecem aqui regularmente!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};