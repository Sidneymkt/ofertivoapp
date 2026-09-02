import { useState, useEffect } from 'react';
import { Copy, Check, Heart, QrCode } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Campaign } from '@/hooks/useCrowdfunding';
import { usePixDonation } from '@/hooks/usePixDonation';
import { useAuth } from '@/hooks/useAuth';
import { generatePixQrCodeDataUrl } from '@/lib/pixQrCode';

interface ContributeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  onSuccess?: () => void;
}

const PRESET_VALUES = [5, 10, 25, 50, 100];

export const ContributeModal = ({
  open,
  onOpenChange,
  campaign,
  onSuccess
}: ContributeModalProps) => {
  const { createDonation, loading, PIX_CONVERSION_RATE, FUND_PERCENTAGE } = usePixDonation();
  const { userProfile } = useAuth();
  const [valor, setValor] = useState('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [step, setStep] = useState<'amount' | 'qrcode'>('amount');
  const [donation, setDonation] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const valorNumerico = parseFloat(valor) || 0;
  const valorFundo = Math.round(valorNumerico * FUND_PERCENTAGE * 100) / 100;
  const valorConvertido = Math.round((valorNumerico - valorFundo) * 100) / 100;
  const pontosGerados = Math.round(valorConvertido * PIX_CONVERSION_RATE);
  const isAnunciante = userProfile?.user_type === 'business';
  const pixKey = donation?.pix_key_snapshot;

  const remainingPoints = campaign.goal_points - campaign.current_points;
  const remainingReais = remainingPoints / 100;

  // Generate QR code when donation is created
  useEffect(() => {
    if (step === 'qrcode' && donation && pixKey) {
      generatePixQrCodeDataUrl(pixKey, Number(donation.valor_total), donation.transaction_id_pix)
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(''));
    }
  }, [step, donation, pixKey]);

  const handleSubmit = async () => {
    if (valorNumerico < 1) return;
    const result = await createDonation(valorNumerico, campaign.id);
    if (result) {
      setDonation(result);
      setStep('qrcode');
    }
  };

  const handleCopyPix = () => {
    if (pixKey?.value) {
      navigator.clipboard.writeText(pixKey.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setStep('amount');
    setValor('');
    setMessage('');
    setIsAnonymous(false);
    setDonation(null);
    setQrCodeDataUrl('');
    onOpenChange(false);
    if (donation) {
      onSuccess?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            💙 Vaquinha Solidária com Recompensa
          </DialogTitle>
          <DialogDescription>
            {campaign.title}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-4 py-2">
            {/* Info da campanha */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Meta</p>
                <p className="text-sm font-bold text-primary">
                  R$ {(campaign.goal_points / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {campaign.goal_points.toLocaleString()} pts
                </p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Faltam</p>
                <p className="text-sm font-bold text-orange-500">
                  R$ {remainingReais.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {remainingPoints.toLocaleString()} pts
                </p>
              </div>
            </div>

            {/* Preset values */}
            <div className="space-y-2">
              <Label>Valor rápido</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_VALUES.map((v) => (
                  <Button
                    key={v}
                    variant={valor === String(v) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValor(String(v))}
                  >
                    R$ {v}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom value */}
            <div className="space-y-2">
              <Label htmlFor="valor-vaquinha">Valor personalizado (R$) *</Label>
              <Input
                id="valor-vaquinha"
                type="number"
                placeholder="Ex: 10.00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>

            {/* Mensagem opcional */}
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem de apoio (opcional)</Label>
              <Textarea
                id="message"
                placeholder="Deixe uma mensagem de incentivo..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>

            {/* Contribuição anônima */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="anonymous"
                checked={isAnonymous}
                onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
              />
              <label
                htmlFor="anonymous"
                className="text-sm font-medium leading-none"
              >
                Contribuir anonimamente
              </label>
            </div>

            {/* Preview */}
            {valorNumerico >= 1 && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Valor da doação PIX</span>
                  <span className="font-semibold">R$ {valorNumerico.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Fundo Ofertivo (10%)</span>
                  <span>R$ {valorFundo.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-primary">
                  <span>🎁 Você recebe</span>
                  <span>{pontosGerados} pontos</span>
                </div>
                {isAnunciante && (
                  <p className="text-xs text-muted-foreground mt-1">
                    🏆 Você ganha o selo "Empresa Apoiadora da Comunidade"
                  </p>
                )}
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={loading || valorNumerico < 1}
              >
                {loading ? 'Gerando...' : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar PIX
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'qrcode' && donation && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-3">
              <div className="bg-white p-4 rounded-xl inline-block mx-auto border-2 border-gray-200 shadow-lg">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code PIX"
                    className="h-48 w-48 mx-auto"
                  />
                ) : (
                  <div className="h-48 w-48 mx-auto flex items-center justify-center text-muted-foreground">
                    Gerando QR Code...
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">
                  Valor: <strong>R$ {Number(donation.valor_total).toFixed(2)}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  ID: {donation.transaction_id_pix}
                </p>
              </div>

              {pixKey && (
                <div className="space-y-2">
                  <Label className="text-xs">Chave PIX ({pixKey.type})</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={pixKey.value}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyPix}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {pixKey.holder && (
                    <p className="text-xs text-muted-foreground">
                      Titular: {pixKey.holder}
                    </p>
                  )}
                </div>
              )}

              <Badge variant="outline" className="text-amber-500 border-amber-500">
                ⏳ Aguardando confirmação do pagamento
              </Badge>
            </div>

            <div className="bg-muted rounded-lg p-3 text-xs text-muted-foreground space-y-1">
              <p>• Escaneie o QR Code acima ou copie a chave PIX</p>
              <p>• Após confirmação, seus <strong>{donation.pontos_gerados} pontos</strong> serão creditados</p>
              <p>• A campanha "{campaign.title}" receberá a contribuição</p>
              <p>• 10% será destinado ao Fundo Social Ofertivo</p>
            </div>

            <Button variant="outline" className="w-full" onClick={handleClose}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
