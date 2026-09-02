import { useState, useEffect } from 'react';
import { Copy, Check, Wallet, ArrowRight, Heart } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { usePixDonation } from '@/hooks/usePixDonation';
import { useAuth } from '@/hooks/useAuth';
import { useCrowdfunding } from '@/hooks/useCrowdfunding';
import { generatePixQrCodeDataUrl } from '@/lib/pixQrCode';

interface PixDonationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  campaignTitle?: string;
}

const PRESET_VALUES = [5, 10, 25, 50, 100];

export const PixDonationModal = ({
  open,
  onOpenChange,
  campaignId,
  campaignTitle,
}: PixDonationModalProps) => {
  const { createDonation, loading, PIX_CONVERSION_RATE, FUND_PERCENTAGE } = usePixDonation();
  const { userProfile } = useAuth();
  const { campaigns } = useCrowdfunding();
  const [valor, setValor] = useState('');
  const [step, setStep] = useState<'amount' | 'qrcode' | 'done'>('amount');
  const [donation, setDonation] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignId || '');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const valorNumerico = parseFloat(valor) || 0;
  const valorFundo = Math.round(valorNumerico * FUND_PERCENTAGE * 100) / 100;
  const valorConvertido = Math.round((valorNumerico - valorFundo) * 100) / 100;
  const pontosGerados = Math.round(valorConvertido * PIX_CONVERSION_RATE);
  const isAnunciante = userProfile?.user_type === 'business';

  const activeCampaigns = (campaigns || []).filter((c: any) => c.is_active);
  const selectedCampaign = activeCampaigns.find((c: any) => c.id === selectedCampaignId);
  const pixKey = donation?.pix_key_snapshot;

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
    const result = await createDonation(valorNumerico, selectedCampaignId || undefined);
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
    setDonation(null);
    setQrCodeDataUrl('');
    setSelectedCampaignId(campaignId || '');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            {isAnunciante ? '💼 Patrocínio via PIX' : '💚 Doação via PIX'}
          </DialogTitle>
          <DialogDescription>
            {isAnunciante
              ? 'Patrocine uma vaquinha e ganhe pontos internos'
              : 'Doe para uma vaquinha e receba pontos como recompensa'}
          </DialogDescription>
        </DialogHeader>

        {step === 'amount' && (
          <div className="space-y-4 py-2">
            {/* Campaign selector */}
            <div className="space-y-2">
              <Label>
                <Heart className="inline h-4 w-4 mr-1 text-pink-500" />
                Escolha uma Vaquinha
              </Label>
              <Select
                value={selectedCampaignId}
                onValueChange={setSelectedCampaignId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma vaquinha para apoiar" />
                </SelectTrigger>
                <SelectContent>
                  {activeCampaigns.map((campaign: any) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{campaign.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {campaign.current_points.toLocaleString()} / {campaign.goal_points.toLocaleString()} pts
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeCampaigns.length === 0 && (
                <p className="text-xs text-muted-foreground">Nenhuma vaquinha ativa no momento.</p>
              )}
            </div>

            {/* Selected campaign info */}
            {selectedCampaign && (
              <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
                <p className="font-semibold">{selectedCampaign.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{selectedCampaign.description}</p>
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>Arrecadado: {selectedCampaign.current_points.toLocaleString()} pts</span>
                  <span>Meta: {selectedCampaign.goal_points.toLocaleString()} pts</span>
                </div>
              </div>
            )}

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
              <Label htmlFor="valor-pix">Valor personalizado (R$)</Label>
              <Input
                id="valor-pix"
                type="number"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                min="1"
                step="0.01"
              />
            </div>

            {/* Preview */}
            {valorNumerico >= 1 && (
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Valor da doação</span>
                  <span className="font-semibold">R$ {valorNumerico.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Fundo da Plataforma (10%)</span>
                  <span>R$ {valorFundo.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Convertido em pontos (90%)</span>
                  <span>R$ {valorConvertido.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold text-primary">
                  <span>Pontos a receber</span>
                  <span>{pontosGerados} pts</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={loading || valorNumerico < 1 || !selectedCampaignId}
            >
              {loading ? 'Registrando...' : 'Gerar QR Code PIX'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {!selectedCampaignId && valorNumerico >= 1 && (
              <p className="text-xs text-muted-foreground text-center">
                Selecione uma vaquinha acima para continuar
              </p>
            )}
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
                {selectedCampaign && (
                  <p className="text-xs text-primary font-medium">
                    Vaquinha: {selectedCampaign.title}
                  </p>
                )}
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
              <p>• Após o pagamento, o admin confirmará e seus pontos serão creditados</p>
              <p>• Você receberá <strong>{donation.pontos_gerados} pontos</strong></p>
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
