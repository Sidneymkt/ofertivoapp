import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Sparkles, 
  Check, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { 
  useAchievementCredits, 
  AVAILABLE_ADVANTAGES,
  AdvantageConfig 
} from '@/hooks/useAchievementCredits';
import { useOffers } from '@/hooks/useOffers';
import { toast } from '@/hooks/use-toast';

interface AdvantagesStoreProps {
  businessId: string | undefined;
}

export const AdvantagesStore: React.FC<AdvantagesStoreProps> = ({ businessId }) => {
  const { 
    availableBalance, 
    redeemAdvantage, 
    hasActiveAdvantage,
    getActiveAdvantage 
  } = useAchievementCredits(businessId);
  
  const { offers } = useOffers();
  const activeOffers = offers.filter(o => o.is_active);

  const [selectedAdvantage, setSelectedAdvantage] = useState<AdvantageConfig | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleSelectAdvantage = (advantage: AdvantageConfig) => {
    setSelectedAdvantage(advantage);
    setSelectedOfferId('');
    setDialogOpen(true);
  };

  const handleRedeem = async () => {
    if (!selectedAdvantage) return;

    if (selectedAdvantage.requires_offer && !selectedOfferId) {
      toast({
        title: 'Selecione uma oferta',
        description: 'Você precisa escolher qual oferta deseja destacar.',
        variant: 'destructive'
      });
      return;
    }

    setIsRedeeming(true);
    const result = await redeemAdvantage(
      selectedAdvantage.type, 
      selectedAdvantage.requires_offer ? selectedOfferId : undefined
    );
    setIsRedeeming(false);

    if (result.success) {
      setDialogOpen(false);
      setSelectedAdvantage(null);
      setSelectedOfferId('');
    } else {
      toast({
        title: 'Erro ao ativar vantagem',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const formatExpiration = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expirado';
    if (diffDays === 1) return '1 dia restante';
    return `${diffDays} dias restantes`;
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AVAILABLE_ADVANTAGES.map((advantage) => {
          const isActive = hasActiveAdvantage(advantage.type);
          const activeAdvantage = getActiveAdvantage(advantage.type);
          const canAfford = availableBalance >= advantage.cost;

          return (
            <Card 
              key={advantage.type}
              className={`relative overflow-hidden transition-all ${
                isActive 
                  ? 'border-green-500 bg-green-50/50 dark:bg-green-950/20' 
                  : canAfford 
                    ? 'hover:shadow-lg hover:border-purple-300' 
                    : 'opacity-60'
              }`}
            >
              {isActive && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-green-500 text-white">
                    <Check className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                </div>
              )}

              <CardHeader className="pb-2">
                <div className="text-3xl mb-2">{advantage.icon}</div>
                <CardTitle className="text-lg">{advantage.name}</CardTitle>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {advantage.description}
                </p>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {advantage.cost.toLocaleString('pt-BR')} pts
                    </span>
                  </div>
                  {advantage.duration_days > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {advantage.duration_days} dias
                    </div>
                  )}
                </div>

                {isActive && activeAdvantage ? (
                  <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {formatExpiration(activeAdvantage.expires_at)}
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    disabled={!canAfford}
                    variant={canAfford ? 'default' : 'outline'}
                    onClick={() => handleSelectAdvantage(advantage)}
                  >
                    {canAfford ? 'Ativar Vantagem' : 'Saldo Insuficiente'}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog de confirmação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">{selectedAdvantage?.icon}</span>
              {selectedAdvantage?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedAdvantage?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedAdvantage?.requires_offer && (
              <div className="space-y-2">
                <Label>Selecione a oferta para destacar</Label>
                <Select value={selectedOfferId} onValueChange={setSelectedOfferId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha uma oferta" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeOffers.map(offer => (
                      <SelectItem key={offer.id} value={offer.id}>
                        {offer.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {activeOffers.length === 0 && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Você precisa ter ofertas ativas para usar esta vantagem.
                  </p>
                )}
              </div>
            )}

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Custo:</span>
                <span className="font-bold text-purple-600">
                  {selectedAdvantage?.cost.toLocaleString('pt-BR')} pts
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Seu saldo:</span>
                <span className="font-medium">
                  {availableBalance.toLocaleString('pt-BR')} pts
                </span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-sm text-muted-foreground">Saldo após ativação:</span>
                <span className="font-medium">
                  {(availableBalance - (selectedAdvantage?.cost || 0)).toLocaleString('pt-BR')} pts
                </span>
              </div>
            </div>

            {selectedAdvantage && selectedAdvantage.duration_days > 0 && (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Esta vantagem ficará ativa por {selectedAdvantage.duration_days} dias.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRedeem}
              disabled={isRedeeming || (selectedAdvantage?.requires_offer && !selectedOfferId)}
              className="bg-gradient-to-r from-purple-600 to-pink-600"
            >
              {isRedeeming ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Ativando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Confirmar Ativação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
