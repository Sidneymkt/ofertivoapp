import { useState, useEffect } from 'react';
import { Sparkles, Copy, Check, QrCode, Wallet, ArrowRight, TrendingUp, Shield, Star } from 'lucide-react';
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
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { AvailableCampaign } from '@/hooks/useSponsorship';
import { usePatrocinioPixPayment } from '@/hooks/usePatrocinioPixPayment';
import { generatePixQrCodeDataUrl } from '@/lib/pixQrCode';

interface SponsorCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: AvailableCampaign;
  onSuccess?: () => void;
}

const PRESET_VALUES = [50, 100, 200, 500, 1000];

export const SponsorCampaignModal = ({
  open,
  onOpenChange,
  campaign,
  onSuccess
}: SponsorCampaignModalProps) => {
  const { createPatrocinioPix, loading, calcBenefits } = usePatrocinioPixPayment();
  const [valor, setValor] = useState('');
  const [step, setStep] = useState<'amount' | 'qrcode'>('amount');
  const [payment, setPayment] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  const valorNumerico = parseFloat(valor) || 0;
  const benefits = calcBenefits(valorNumerico);
  const progress = (campaign.current_points / campaign.goal_points) * 100;
  const pixKey = payment?.pix_key_snapshot;

  // Generate QR code when payment is created
  useEffect(() => {
    if (step === 'qrcode' && payment && pixKey) {
      generatePixQrCodeDataUrl(pixKey, Number(payment.valor_total), payment.transaction_id_pix)
        .then(setQrCodeDataUrl)
        .catch(() => setQrCodeDataUrl(''));
    }
  }, [step, payment, pixKey]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep('amount');
      setValor('');
      setPayment(null);
      setCopied(false);
      setQrCodeDataUrl('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (valorNumerico < 10) return;
    const result = await createPatrocinioPix(valorNumerico, campaign.id);
    if (result) {
      setPayment(result);
      setStep('qrcode');
    }
  };

  const handleCopyPix = () => {
    if (pixKey?.value) {
      navigator.clipboard.writeText(pixKey.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Patrocinar via PIX
          </DialogTitle>
          <DialogDescription>
            Apoie esta causa e receba benefícios exclusivos
          </DialogDescription>
        </DialogHeader>

        {/* Campaign preview */}
        <Card className="border-2 border-dashed border-primary/30">
          <CardContent className="p-4">
            <div className="flex gap-3">
              {campaign.image_url && (
                <img
                  src={campaign.image_url}
                  alt={campaign.title}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{campaign.title}</h4>
                <div className="mt-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs mt-1">
                    <span>{campaign.current_points.toLocaleString()} pts</span>
                    <span className="text-muted-foreground">
                      Meta: {campaign.goal_points.toLocaleString()} pts
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {step === 'amount' && (
          <div className="space-y-5 py-2">
            {/* Value selector */}
            <div className="space-y-3">
              <Label>Valor do Patrocínio (mín. R$ 10)</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_VALUES.map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={valor === String(v) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setValor(String(v))}
                  >
                    R$ {v}
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                placeholder="Ou digite outro valor"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                min="10"
                step="1"
              />
            </div>

            {/* Benefits breakdown */}
            {valorNumerico >= 10 && (
              <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  Seus Benefícios
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-primary">{benefits.pontosGerados.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Pontos internos</p>
                  </div>
                  <div className="text-center p-2 bg-background/50 rounded-lg">
                    <p className="text-lg font-bold text-green-500">
                      R$ {benefits.valorBeneficio.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Em benefícios</p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> 10% (R$ {benefits.valorFundo.toFixed(2)}) → Fundo da Plataforma</p>
                  <p className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> 90% (R$ {benefits.valorBeneficio.toFixed(2)}) → Seus benefícios</p>
                </div>

                <ul className="space-y-1.5 text-xs text-muted-foreground mt-2">
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />
                    Impulsionamento de ofertas
                  </li>
                  <li className="flex items-center gap-2">
                    <Star className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    Destaque no feed e prioridade em buscas
                  </li>
                  <li className="flex items-center gap-2">
                    <Shield className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    Selo "Empresa Patrocinadora"
                  </li>
                </ul>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                onClick={handleSubmit}
                disabled={loading || valorNumerico < 10}
              >
                {loading ? 'Gerando PIX...' : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code PIX
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'qrcode' && payment && (
          <div className="space-y-4 py-2">
            <div className="text-center space-y-3">
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-400">
                Aguardando Pagamento
              </Badge>

              <div>
                <p className="text-2xl font-bold">R$ {Number(payment.valor_total).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  {payment.pontos_gerados.toLocaleString()} pontos serão creditados após confirmação
                </p>
              </div>

              {/* QR Code */}
              {qrCodeDataUrl ? (
                <div className="flex justify-center">
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code PIX"
                    className="w-56 h-56 rounded-lg border-2 border-border"
                  />
                </div>
              ) : (
                <div className="w-56 h-56 mx-auto bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-muted-foreground animate-pulse" />
                </div>
              )}

              {/* Copy PIX key */}
              {pixKey?.value && (
                <div className="space-y-2">
                  <Label className="text-xs">Chave PIX</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={pixKey.value}
                      readOnly
                      className="text-xs font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyPix}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                ID: {payment.transaction_id_pix}
              </p>
            </div>

            {/* Benefits summary */}
            <div className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
              <p><strong>Após confirmação do pagamento:</strong></p>
              <p>• {payment.pontos_gerados.toLocaleString()} pontos internos creditados</p>
              <p>• Selo "Empresa Patrocinadora" ativado</p>
              <p>• Marca visível na campanha</p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onOpenChange(false);
                onSuccess?.();
              }}
            >
              Fechar (pagamento será confirmado automaticamente)
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
