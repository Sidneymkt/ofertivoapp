import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, QrCode, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PaymentMethodSelectorProps {
  planName: string;
  planPrice: number;
  onSelectMethod: (gateway: 'abacatepay' | 'mercadopago') => Promise<void>;
  loading?: boolean;
}

export const PaymentMethodSelector = ({
  planName,
  planPrice,
  onSelectMethod,
  loading = false
}: PaymentMethodSelectorProps) => {
  const [selectedGateway, setSelectedGateway] = useState<'abacatepay' | 'mercadopago'>('abacatepay');
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      await onSelectMethod(selectedGateway);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-lg sm:text-xl">Escolha a forma de pagamento</CardTitle>
        <CardDescription className="text-sm">
          Plano {planName} - R$ {planPrice.toFixed(2)}/mês
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
        <Alert className="py-2 sm:py-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs sm:text-sm">
            <strong>PIX é recomendado:</strong> Confirmação instantânea e taxas menores.
          </AlertDescription>
        </Alert>

        <RadioGroup 
          value={selectedGateway} 
          onValueChange={(value) => setSelectedGateway(value as 'abacatepay' | 'mercadopago')}
          className="space-y-2 sm:space-y-3"
        >
          <div className="flex items-center space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="abacatepay" id="pix" />
            <Label htmlFor="pix" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
              <QrCode className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">PIX (Recomendado)</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Confirmação instantânea • Taxas: 0,99% + R$ 0,10
                </div>
              </div>
            </Label>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 border rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors">
            <RadioGroupItem value="mercadopago" id="card" />
            <Label htmlFor="card" className="flex items-center gap-2 sm:gap-3 cursor-pointer flex-1">
              <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base">Cartão de Crédito</div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Parcelamento disponível • Taxas: 4,99% + R$ 0,39
                </div>
              </div>
            </Label>
          </div>
        </RadioGroup>

        <Button 
          onClick={handlePayment} 
          disabled={processing || loading}
          className="w-full mt-4"
          size="lg"
        >
          {(processing || loading) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm sm:text-base">Processando...</span>
            </>
          ) : (
            <span className="text-sm sm:text-base">
              Prosseguir com {selectedGateway === 'abacatepay' ? 'PIX' : 'Cartão'}
            </span>
          )}
        </Button>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Ao continuar, você concorda com nossos Termos de Serviço
        </p>
      </CardContent>
    </Card>
  );
};
