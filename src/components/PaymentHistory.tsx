import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePayments, Transaction } from '@/hooks/usePayments';
import { CheckCircle2, XCircle, Clock, AlertCircle, QrCode, CreditCard, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PaymentHistoryProps {
  businessId: string;
}

const getStatusIcon = (status: Transaction['status']) => {
  switch (status) {
    case 'paid':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'expired':
      return <AlertCircle className="h-4 w-4 text-orange-600" />;
    default:
      return <Clock className="h-4 w-4 text-blue-600" />;
  }
};

const getStatusBadge = (status: Transaction['status']) => {
  const variants: Record<Transaction['status'], any> = {
    paid: 'default',
    pending: 'secondary',
    failed: 'destructive',
    expired: 'outline',
    refunded: 'outline'
  };

  const labels: Record<Transaction['status'], string> = {
    paid: 'Pago',
    pending: 'Pendente',
    failed: 'Falhou',
    expired: 'Expirado',
    refunded: 'Reembolsado'
  };

  return (
    <Badge variant={variants[status]}>
      {labels[status]}
    </Badge>
  );
};

export const PaymentHistory = ({ businessId }: PaymentHistoryProps) => {
  const { transactions, loading, retryPaymentWithFallback, checkPaymentStatus } = usePayments(businessId);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Pagamentos</CardTitle>
        <CardDescription>
          Acompanhe todas as transações da sua assinatura
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma transação encontrada
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1">
                    {getStatusIcon(transaction.status)}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        R$ {transaction.amount.toFixed(2)}
                      </span>
                      {getStatusBadge(transaction.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {transaction.gateway === 'abacatepay' ? (
                        <QrCode className="h-3 w-3" />
                      ) : (
                        <CreditCard className="h-3 w-3" />
                      )}
                      <span>
                        {transaction.gateway === 'abacatepay' ? 'PIX' : 'Cartão'} 
                        {transaction.payment_method && ` - ${transaction.payment_method}`}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.created_at), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </div>

                    {transaction.status === 'paid' && transaction.transaction_fee && (
                      <div className="text-xs text-muted-foreground">
                        Taxa: R$ {transaction.transaction_fee.toFixed(2)} • 
                        Líquido: R$ {transaction.net_revenue?.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {transaction.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkPaymentStatus(transaction.id)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Verificar
                      </Button>
                    )}
                    
                    {transaction.status === 'expired' && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => retryPaymentWithFallback(transaction.id)}
                      >
                        Tentar Novamente
                      </Button>
                    )}
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
