import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/BackButton';
import { AchievementCreditsCard } from '@/components/business/AchievementCreditsCard';
import { AdvantagesStore } from '@/components/business/AdvantagesStore';
import { useAuth } from '@/hooks/useAuth';
import { useBusiness } from '@/hooks/useBusiness';
import { useAchievementCredits } from '@/hooks/useAchievementCredits';
import { 
  Sparkles, 
  History, 
  Trophy, 
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BusinessAdvantages() {
  const { user } = useAuth();
  const { business } = useBusiness();
  const { 
    credits,
    transactions, 
    activeAdvantages,
    loading 
  } = useAchievementCredits(business?.id);

  if (!user || !business) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/50 p-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você precisa ter um negócio cadastrado para acessar as vantagens.
          </p>
        </div>
      </div>
    );
  }

  const activeCount = activeAdvantages.filter(
    a => a.is_active && new Date(a.expires_at) > new Date()
  ).length;

  const expiredCount = activeAdvantages.filter(
    a => !a.is_active || new Date(a.expires_at) <= new Date()
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <BackButton to="/dashboard" />
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-purple-600" />
              Vantagens Exclusivas
            </h1>
            <p className="text-muted-foreground">
              Use seus créditos por conquistas para ativar vantagens na plataforma
            </p>
          </div>
        </div>

        {/* Card de créditos */}
        <div className="mb-6">
          <AchievementCreditsCard businessId={business.id} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="store" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Loja de Vantagens
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Vantagens Ativas ({activeCount})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store">
            <AdvantagesStore businessId={business.id} />
          </TabsContent>

          <TabsContent value="active">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeAdvantages
                .filter(a => a.is_active && new Date(a.expires_at) > new Date())
                .map(advantage => {
                  const now = new Date();
                  const expires = new Date(advantage.expires_at);
                  const diffMs = expires.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

                  return (
                    <Card key={advantage.id} className="border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold capitalize">
                              {advantage.advantage_type.replace(/_/g, ' ')}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Ativado em {format(new Date(advantage.activated_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Ativo
                          </Badge>
                        </div>
                        
                        <div className="mt-4 flex items-center gap-2 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {diffDays === 1 ? '1 dia restante' : `${diffDays} dias restantes`}
                          </span>
                        </div>

                        <div className="mt-2 text-xs text-muted-foreground">
                          Expira em {format(expires, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

              {activeCount === 0 && (
                <div className="col-span-2 text-center py-12">
                  <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Você não possui vantagens ativas no momento.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Histórico de Transações
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-8">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Nenhuma transação encontrada.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map(tx => (
                      <div 
                        key={tx.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          {tx.transaction_type === 'earn' ? (
                            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                            </div>
                          ) : (
                            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900">
                              <TrendingDown className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">
                              {tx.description || (tx.transaction_type === 'earn' ? 'Créditos ganhos' : 'Vantagem resgatada')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('pt-BR')} pts
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Saldo: {tx.balance_after.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
