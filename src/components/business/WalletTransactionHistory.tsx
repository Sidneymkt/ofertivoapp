import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, ArrowDownCircle, ArrowUpCircle, RefreshCw, Coins } from 'lucide-react';
import { useBusinessWallet, WalletTransaction } from '@/hooks/useBusinessWallet';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WalletTransactionHistory: React.FC = () => {
  const { transactions, isTransactionsLoading } = useBusinessWallet();

  if (isTransactionsLoading) {
    return (
      <Card className="border-0 shadow-card">
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTransactionIcon = (type: WalletTransaction['transaction_type']) => {
    switch (type) {
      case 'debit':
        return <ArrowDownCircle className="w-4 h-4 text-red-500" />;
      case 'credit':
        return <ArrowUpCircle className="w-4 h-4 text-emerald-500" />;
      case 'reset':
        return <RefreshCw className="w-4 h-4 text-blue-500" />;
      case 'allocation':
        return <Coins className="w-4 h-4 text-purple-500" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const getTransactionBadge = (type: WalletTransaction['transaction_type']) => {
    switch (type) {
      case 'debit':
        return <Badge variant="outline" className="text-red-600 border-red-500/50">Débito</Badge>;
      case 'credit':
        return <Badge variant="outline" className="text-emerald-600 border-emerald-500/50">Crédito</Badge>;
      case 'reset':
        return <Badge variant="outline" className="text-blue-600 border-blue-500/50">Reset</Badge>;
      case 'allocation':
        return <Badge variant="outline" className="text-purple-600 border-purple-500/50">Alocação</Badge>;
      default:
        return <Badge variant="outline">Outro</Badge>;
    }
  };

  const formatPoints = (points: number) => {
    if (points >= 1000) {
      return `${(points / 1000).toFixed(1)}k`;
    }
    return points.toString();
  };

  return (
    <Card className="border-0 shadow-card min-w-0">
      <CardHeader className="p-4 sm:p-6 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0">
          <History className="w-5 h-5 shrink-0" />
          <span className="truncate">Histórico de Transações</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0 min-w-0">
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Coins className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma transação ainda</p>
            <p className="text-sm">As transações aparecerão aqui quando check-ins forem validados</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-1 sm:pr-4">
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors min-w-0"
                >
                  <div className="mt-1 shrink-0">
                    {getTransactionIcon(tx.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {tx.description || 'Transação'}
                        </p>
                        <p className="text-xs text-muted-foreground break-words">
                          {format(new Date(tx.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="text-left sm:text-right shrink-0">
                        <p className={`font-bold ${tx.transaction_type === 'debit' ? 'text-red-600' : 'text-emerald-600'}`}>
                          {tx.transaction_type === 'debit' ? '-' : '+'}
                          {formatPoints(tx.amount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Saldo: {formatPoints(tx.balance_after)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 min-w-0">
                      <div className="shrink-0">{getTransactionBadge(tx.transaction_type)}</div>
                      {tx.metadata && typeof tx.metadata === 'object' && 'offer_title' in tx.metadata && (
                        <span className="text-xs text-muted-foreground truncate min-w-0 flex-1">
                          {String(tx.metadata.offer_title)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default WalletTransactionHistory;
