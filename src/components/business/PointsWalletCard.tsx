import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, TrendingDown, Calendar, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { useBusinessWallet } from '@/hooks/useBusinessWallet';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PointsWalletCardProps {
  compact?: boolean;
}

const PointsWalletCard: React.FC<PointsWalletCardProps> = ({ compact = false }) => {
  const {
    balance,
    monthlyAllocation,
    totalConsumed,
    percentageUsed,
    nextResetAt,
    isLoading,
    isLowBalance,
    refetchWallet
  } = useBusinessWallet();

  if (isLoading) {
    return (
      <Card className="border-0 shadow-card animate-pulse">
        <CardContent className="py-6">
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const formatPoints = (points: number) => {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  };

  const pointsToReais = (points: number) => {
    return (points / 100).toFixed(2);
  };

  if (compact) {
    return (
      <Card className={`border-0 shadow-card ${isLowBalance ? 'ring-2 ring-orange-500/50' : ''}`}>
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">Saldo de Pontos</p>
                <p className="text-xl font-bold truncate">{formatPoints(balance)}</p>
              </div>
            </div>
            {isLowBalance && (
              <Badge variant="outline" className="text-orange-600 border-orange-500/50 self-start sm:self-auto">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Saldo baixo
              </Badge>
            )}
          </div>
          <Progress value={100 - percentageUsed} className="mt-3 h-2" />
          <p className="text-xs text-muted-foreground mt-1 break-words">
            {formatPoints(balance)} de {formatPoints(monthlyAllocation)} disponíveis
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-0 shadow-card overflow-hidden ${isLowBalance ? 'ring-2 ring-orange-500/50' : ''}`}>
      <CardHeader className="pb-2 px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
            <div className="p-1.5 sm:p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <span className="truncate">Carteira de Pontos</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchWallet()}
            className="h-8 w-8 shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-3 sm:px-6 pb-4 sm:pb-6">
        {/* Saldo Principal */}
        <div className="text-center py-3 sm:py-4 px-3 sm:px-6 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 rounded-xl overflow-hidden">
          <p className="text-xs sm:text-sm text-muted-foreground mb-1">Saldo Disponível</p>
          <p className="text-2xl sm:text-4xl font-bold text-emerald-600 truncate">{formatPoints(balance)}</p>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">≈ R$ {pointsToReais(balance)}</p>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs sm:text-sm">
            <span className="text-muted-foreground">Consumido este mês</span>
            <span className="font-medium shrink-0">{percentageUsed.toFixed(1)}%</span>
          </div>
          <Progress value={percentageUsed} className="h-2.5 sm:h-3" />
          <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {formatPoints(totalConsumed)} usados
            </span>
            <span>{formatPoints(monthlyAllocation)} total/mês</span>
          </div>
        </div>

        {/* Próximo Reset */}
        {nextResetAt && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 p-2.5 sm:p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm min-w-0">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Próximo reset</span>
            </div>
            <span className="text-xs sm:text-sm font-medium break-words">
              {formatDistanceToNow(new Date(nextResetAt), { locale: ptBR, addSuffix: true })}
            </span>
          </div>
        )}

        {/* Alerta de Saldo Baixo */}
        {isLowBalance && (
          <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 shrink-0" />
              <div className="text-sm min-w-0">
                <p className="font-medium text-orange-600">Saldo baixo</p>
                <p className="text-muted-foreground break-words">
                  Quando o saldo zerar, suas ofertas serão pausadas automaticamente.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Info sobre o sistema */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">100 pontos = R$ 1,00</p>
          <Link to="/anunciante/carteira" className="w-full sm:w-auto">
            <Button variant="ghost" size="sm" className="text-xs h-8 w-full sm:w-auto justify-center">
              Ver detalhes
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default PointsWalletCard;
