import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles, Trophy, ArrowRight, Infinity, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAchievementCredits } from '@/hooks/useAchievementCredits';

interface AchievementCreditsCardProps {
  businessId: string | undefined;
  compact?: boolean;
}

export const AchievementCreditsCard: React.FC<AchievementCreditsCardProps> = ({
  businessId,
  compact = false
}) => {
  const navigate = useNavigate();
  const { availableBalance, activeAdvantages, loading, syncing, syncCredits } = useAchievementCredits(businessId);

  const activeCount = activeAdvantages.filter(
    a => a.is_active && new Date(a.expires_at) > new Date()
  ).length;

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await syncCredits();
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className={compact ? 'p-4' : 'p-6'}>
          <div className="h-16 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card 
        className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800 cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate('/anunciante/vantagens')}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Créditos por Conquistas</p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {availableBalance.toLocaleString('pt-BR')} pts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <Infinity className="w-3 h-3" />
                Não expira
              </Badge>
              <ArrowRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-200 dark:border-purple-800">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900">
              <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Créditos por Conquistas</h3>
              <p className="text-sm text-muted-foreground">
                Ganhos ao desbloquear conquistas
              </p>
            </div>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Infinity className="w-3 h-3" />
            Não expira
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-4 bg-background/50 rounded-lg border border-purple-200/50 dark:border-purple-800/50">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {availableBalance.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-muted-foreground">Créditos Disponíveis</p>
          </div>
          <div className="text-center p-4 bg-background/50 rounded-lg border border-green-200/50 dark:border-green-800/50">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {activeCount}
            </p>
            <p className="text-sm text-muted-foreground">Vantagens Ativas</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Use seus créditos para ativar vantagens exclusivas na plataforma. 
          Esses créditos são separados dos pontos promocionais.
        </p>

        <Button 
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          onClick={() => navigate('/anunciante/vantagens')}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Ver Vantagens Exclusivas
        </Button>
      </CardContent>
    </Card>
  );
};
