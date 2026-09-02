import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calculator, CheckCircle, AlertTriangle, XCircle, Coins, Users, Target } from 'lucide-react';
import { useBusinessWallet } from '@/hooks/useBusinessWallet';

interface PointsSimulatorProps {
  pointsPerAction: number;
  maxActions: number | null;
  compact?: boolean;
}

const PointsSimulator: React.FC<PointsSimulatorProps> = ({
  pointsPerAction,
  maxActions,
  compact = false
}) => {
  const { wallet, simulateOfferCost, isLoading } = useBusinessWallet();

  const simulation = useMemo(() => {
    if (!wallet || isLoading) return null;
    return simulateOfferCost(pointsPerAction, maxActions);
  }, [wallet, pointsPerAction, maxActions, isLoading, simulateOfferCost]);

  if (isLoading) {
    return (
      <Card className="border-2 border-dashed animate-pulse">
        <CardContent className="py-6">
          <div className="h-32 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (!simulation) {
    return null;
  }

  const formatPoints = (points: number | null) => {
    if (points === null) return '∞';
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  };

  const pointsToReais = (points: number) => {
    return (points / 100).toFixed(2);
  };

  return (
    <Card className={`border ${simulation.canAfford ? 'border-emerald-500/40' : 'border-destructive/50'} ${compact ? 'bg-muted/20' : 'border-2'}`}>
      <CardHeader className={compact ? 'pb-2 px-3 pt-3' : 'pb-2'}>
        <CardTitle className={`flex items-center gap-2 ${compact ? 'text-sm' : 'text-base'}`}>
          <Calculator className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          Simulação de Pontos
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'space-y-2 px-3 pb-3' : 'space-y-4'}>
        {/* Status */}
        {simulation.canAfford ? (
          <div className={`flex items-center gap-2 ${compact ? 'p-2' : 'p-3'} bg-emerald-500/10 rounded-lg`}>
            <CheckCircle className={compact ? 'w-4 h-4 text-emerald-600' : 'w-5 h-5 text-emerald-600'} />
            <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-emerald-600`}>
              Saldo suficiente para esta oferta
            </span>
          </div>
        ) : (
          <Alert variant="destructive">
            <XCircle className="w-4 h-4" />
            <AlertDescription>
              Saldo insuficiente! Você precisa de {formatPoints(simulation.totalCost)} pontos, 
              mas possui apenas {formatPoints(simulation.currentBalance)}.
            </AlertDescription>
          </Alert>
        )}

        {/* Detalhes da Simulação */}
        <div className={`grid grid-cols-2 ${compact ? 'gap-2' : 'gap-3'}`}>
          <div className={`${compact ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              <Coins className="w-3 h-3" />
              Por check-in
            </div>
            <p className={`${compact ? 'text-base' : 'text-lg'} font-bold leading-tight`}>{formatPoints(simulation.pointsPerAction)}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              ≈ R$ {pointsToReais(simulation.pointsPerAction)}
            </p>
          </div>

          <div className={`${compact ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              <Users className="w-3 h-3" />
              Limite
            </div>
            <p className={`${compact ? 'text-base' : 'text-lg'} font-bold leading-tight`}>
              {simulation.maxActions !== null ? simulation.maxActions : '∞'}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {simulation.maxActions !== null ? 'check-ins' : 'até zerar'}
            </p>
          </div>

          <div className={`${compact ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              <Target className="w-3 h-3" />
              Custo total
            </div>
            <p className={`${compact ? 'text-base' : 'text-lg'} font-bold leading-tight text-amber-600`}>
              {formatPoints(simulation.totalCost)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {simulation.totalCost !== null 
                ? `≈ R$ ${pointsToReais(simulation.totalCost)}`
                : 'Variável'}
            </p>
          </div>

          <div className={`${compact ? 'p-2' : 'p-3'} bg-muted/50 rounded-lg`}>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] sm:text-xs mb-0.5">
              <Coins className="w-3 h-3" />
              Restante
            </div>
            <p className={`${compact ? 'text-base' : 'text-lg'} font-bold leading-tight ${simulation.canAfford ? 'text-emerald-600' : 'text-destructive'}`}>
              {simulation.remainingBalance !== null 
                ? formatPoints(simulation.remainingBalance)
                : formatPoints(simulation.currentBalance)}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              após ativação
            </p>
          </div>
        </div>


        {/* Barra de uso */}
        {simulation.percentageOfWallet !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-muted-foreground">Uso da carteira mensal</span>
              <span className={simulation.percentageOfWallet > 50 ? 'text-amber-600 font-medium' : ''}>
                {simulation.percentageOfWallet}%
              </span>
            </div>
            <Progress 
              value={simulation.percentageOfWallet} 
              className={`h-1.5 ${simulation.percentageOfWallet > 80 ? '[&>div]:bg-amber-500' : ''}`}
            />
          </div>
        )}

        {/* Estimativa de alcance */}
        {!compact && simulation.estimatedActions && simulation.estimatedActions > 0 && (
          <div className="p-3 bg-blue-500/10 rounded-lg">
            <p className="text-sm text-center">
              <span className="text-muted-foreground">Alcance estimado: </span>
              <span className="font-bold text-blue-600">
                até {simulation.estimatedActions} clientes
              </span>
            </p>
          </div>
        )}

        {/* Aviso de saldo baixo */}
        {simulation.canAfford && simulation.remainingBalance !== null && simulation.remainingBalance < simulation.currentBalance * 0.1 && (
          <div className="flex items-center gap-2 p-2 bg-amber-500/10 rounded-lg text-[10px] sm:text-xs text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Esta oferta consumirá a maior parte do seu saldo mensal
            </span>
          </div>
        )}

        {/* Dica */}
        {!compact && (
          <p className="text-xs text-center text-muted-foreground">
            💡 Pontos são debitados apenas quando check-ins são validados
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default PointsSimulator;
