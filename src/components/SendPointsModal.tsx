import { useState, useEffect } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { usePointsTransfer } from '@/hooks/usePointsTransfer';

interface SendPointsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
  userPoints: number;
  onSuccess?: () => void;
}

export const SendPointsModal = ({
  open,
  onOpenChange,
  receiverId,
  receiverName,
  userPoints,
  onSuccess
}: SendPointsModalProps) => {
  const { transferPoints, loading, lastTransferSuccess } = usePointsTransfer();
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(userPoints);

  // Sync external userPoints with internal state
  useEffect(() => {
    setCurrentBalance(userPoints);
  }, [userPoints]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setShowSuccess(false);
      setAmount('');
      setMessage('');
    }
  }, [open]);

  const handleTransfer = async () => {
    const pointsAmount = parseInt(amount);
    
    if (isNaN(pointsAmount) || pointsAmount <= 0) {
      return;
    }

    if (pointsAmount > currentBalance) {
      return;
    }

    const success = await transferPoints(receiverId, pointsAmount, message);
    
    if (success) {
      // Update local balance immediately
      setCurrentBalance(prev => prev - pointsAmount);
      
      // Show success feedback
      setShowSuccess(true);
      
      // Call parent success callback
      onSuccess?.();
      
      // Close modal after short delay
      setTimeout(() => {
        setAmount('');
        setMessage('');
        setShowSuccess(false);
        onOpenChange(false);
      }, 1500);
    }
  };

  const pointsValue = parseInt(amount) || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>💰 Enviar Pontos</DialogTitle>
          <DialogDescription>
            Envie pontos para {receiverName}
          </DialogDescription>
        </DialogHeader>

        {showSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-success/20 rounded-full flex items-center justify-center animate-pulse">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-success">Transferência Realizada!</h3>
              <p className="text-muted-foreground">
                {pointsValue} pontos enviados para {receiverName}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Saldo disponível */}
            <div className="bg-muted rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Seu saldo</p>
              <p className="text-2xl font-bold text-primary">{currentBalance.toLocaleString('pt-BR')} pontos</p>
            </div>

            {/* Quantidade */}
            <div className="space-y-2">
              <Label htmlFor="amount">Quantidade de pontos *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Ex: 100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={currentBalance}
              />
              {pointsValue > currentBalance && (
                <p className="text-sm text-destructive">Saldo insuficiente</p>
              )}
            </div>

            {/* Mensagem opcional */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Ex: Apoio ao seu projeto..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Preview */}
            {pointsValue > 0 && pointsValue <= currentBalance && (
              <div className="bg-success/10 border border-success rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-semibold">{receiverName}</span> receberá{' '}
                  <span className="font-bold text-success">{pointsValue.toLocaleString('pt-BR')} pontos</span>
                </p>
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleTransfer}
                disabled={loading || !amount || pointsValue <= 0 || pointsValue > currentBalance}
              >
                {loading ? (
                  'Enviando...'
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
