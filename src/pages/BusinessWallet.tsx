import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BackButton } from '@/components/BackButton';
import { Wallet, CreditCard, TrendingUp } from 'lucide-react';
import PointsWalletCard from '@/components/business/PointsWalletCard';
import WalletTransactionHistory from '@/components/business/WalletTransactionHistory';
import { useBusinessWallet } from '@/hooks/useBusinessWallet';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const BusinessWallet: React.FC = () => {
  const { offerConsumption } = useBusinessWallet();

  const formatPoints = (points: number) => {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6">
        {/* Header */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-4 mb-4 sm:mb-6 min-w-0">
          <BackButton to="/anunciante/dashboard" label="Voltar" className="shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold leading-tight">Carteira de Pontos</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Gerencie seus pontos promocionais
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-3 sm:gap-6 min-w-0">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6 min-w-0">
            {/* Card da Carteira (versão expandida) */}
            <PointsWalletCard />

            {/* Consumo por Oferta */}
            <Card className="border-0 shadow-card">
              <CardHeader className="p-4 sm:p-6 pb-3">
                <CardTitle className="flex items-center gap-2 text-base sm:text-xl min-w-0">
                  <TrendingUp className="w-5 h-5 shrink-0" />
                  <span className="truncate">Consumo por Oferta</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                {offerConsumption.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nenhuma oferta ainda</p>
                    <Link to="/anunciante/ofertas/nova">
                      <Button className="mt-4 w-full sm:w-auto">Criar Oferta</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {offerConsumption.map((offer) => (
                      <div
                        key={offer.id}
                        className="p-3 sm:p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors min-w-0"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1 min-w-0">
                              <p className="font-medium truncate min-w-0 flex-1 basis-full sm:basis-auto">{offer.title}</p>
                              {offer.is_paused_no_balance && (
                                <Badge variant="outline" className="text-orange-600 border-orange-500/50 shrink-0">
                                  Pausada
                                </Badge>
                              )}
                              {!offer.is_active && !offer.is_paused_no_balance && (
                                <Badge variant="secondary" className="shrink-0">
                                  Inativa
                                </Badge>
                              )}
                              {offer.is_active && !offer.is_paused_no_balance && (
                                <Badge variant="default" className="bg-emerald-600 shrink-0">
                                  Ativa
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                              <span>{formatPoints(offer.points_per_action || 50)} pts/check-in</span>
                              <span className="hidden sm:inline">•</span>
                              <span>
                                {offer.current_actions || 0}
                                {offer.max_actions ? `/${offer.max_actions}` : ''} ações
                              </span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right shrink-0">
                            <p className="font-bold text-sm sm:text-lg text-amber-600">
                              -{formatPoints(offer.total_points_consumed || 0)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">consumidos</p>
                          </div>
                        </div>
                        {offer.max_actions && (
                          <div className="mt-3">
                            <Progress
                              value={((offer.current_actions || 0) / offer.max_actions) * 100}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground mt-1 text-left sm:text-right">
                              {Math.round(((offer.current_actions || 0) / offer.max_actions) * 100)}% do limite
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 sm:space-y-6 min-w-0">
            {/* Histórico de Transações */}
            <WalletTransactionHistory />

            {/* Info sobre o sistema */}
            <Card className="border-0 shadow-card bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-4 sm:p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-base sm:text-lg min-w-0">
                  <Wallet className="w-5 h-5 shrink-0" />
                  <span className="truncate">Como funciona?</span>
                </h3>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    <strong className="text-foreground">100 pontos = R$ 1,00</strong>
                    <br />
                    Pontos são créditos promocionais para incentivar check-ins.
                  </p>
                  <p>
                    <strong className="text-foreground">Débito automático</strong>
                    <br />
                    Pontos são debitados apenas quando um check-in é validado.
                  </p>
                  <p>
                    <strong className="text-foreground">Reset mensal</strong>
                    <br />
                    Sua carteira é recarregada todo mês conforme seu plano.
                  </p>
                  <p>
                    <strong className="text-foreground">Ofertas pausadas</strong>
                    <br />
                    Se o saldo zerar, suas ofertas são pausadas automaticamente.
                  </p>
                </div>
                <Link to="/anunciante/planos">
                  <Button variant="outline" className="w-full mt-4">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Fazer Upgrade
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessWallet;
