import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, CheckCircle2, QrCode, ShoppingCart, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createOfferOrder, OfferOrder } from '@/hooks/useOfferOrders';
import { generatePixQrCodeDataUrl } from '@/lib/pixQrCode';

interface Props {
  open: boolean;
  onClose: () => void;
  offer: { id: string; title: string; discounted_price: number; checkin_points?: number; image_url?: string | null };
  businessId: string;
  businessName?: string;
}

export const PixPurchaseModal = ({ open, onClose, offer, businessId, businessName }: Props) => {
  const [businessContact, setBusinessContact] = useState<{ whatsapp?: string; phone?: string } | null>(null);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OfferOrder | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paidStatus, setPaidStatus] = useState<'pendente' | 'pago' | 'cancelado'>('pendente');

  const amount = Number(offer.discounted_price || 0);
  const points = useMemo(() => Math.max(offer.checkin_points || 50, Math.floor(amount * 100)), [amount, offer.checkin_points]);
  const pixDetails = order?.pix_key_snapshot as { type?: string; value?: string; holder?: string; bank?: string } | undefined;

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: biz } = await (supabase as any)
        .from('businesses')
        .select('whatsapp, phone')
        .eq('id', businessId)
        .maybeSingle();
      setBusinessContact(biz || null);
    })();
  }, [open, businessId]);

  // Listen to order updates for real-time status
  useEffect(() => {
    if (!order?.id) return;
    const ch = supabase
      .channel(`order_${order.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offer_orders', filter: `id=eq.${order.id}` }, (payload) => {
        const s = (payload.new as any).status;
        setPaidStatus(s);
        if (s === 'pago') toast.success('Pagamento confirmado! Pontos creditados.');
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [order?.id]);

  const generate = async () => {
    setLoading(true);
    try {
      const created = await createOfferOrder({
        offerId: offer.id,
        amount,
        pointsToAward: points,
        consumerPhone: phone || undefined,
      });
      if (!created) return;
      const snapshot = created.pix_key_snapshot as { type?: string; value?: string; holder?: string } | undefined;
      if (!snapshot?.value) {
        toast.error('Pedido criado, mas a chave PIX não foi retornada. Tente novamente.');
        return;
      }
      setOrder(created);
      const qr = await generatePixQrCodeDataUrl(
        { type: snapshot.type || 'pix', value: snapshot.value, holder: snapshot.holder || businessName || 'Ofertivo' },
        amount,
        created.tx_code,
      );
      setQrDataUrl(qr);
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (!pixDetails?.value) return;
    navigator.clipboard.writeText(pixDetails.value);
    toast.success('Chave PIX copiada!');
  };

  const reset = () => { setOrder(null); setQrDataUrl(null); setPaidStatus('pendente'); };
  const handleClose = () => { reset(); onClose(); };

  const sendReceiptWhatsApp = () => {
    if (!order) return;
    const raw = (businessContact?.whatsapp || businessContact?.phone || '').replace(/\D/g, '');
    const number = raw ? (raw.startsWith('55') ? raw : `55${raw}`) : '';
    const msg =
      `Olá${businessName ? ` ${businessName}` : ''}! 👋\n\n` +
      `Segue o comprovante do meu pagamento PIX:\n` +
      `• Oferta: ${offer.title}\n` +
      `• Valor: R$ ${amount.toFixed(2)}\n` +
      `• Código do pedido: ${order.tx_code}\n\n` +
      `📎 Vou anexar o comprovante nesta conversa. Podem confirmar por favor? Obrigado!`;
    const url = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary" /> Comprar via PIX</DialogTitle>
          <DialogDescription>Pague direto ao anunciante {businessName || ''}. Sem intermediação.</DialogDescription>
        </DialogHeader>

        {!order && (
          <div className="space-y-4">
            <div className="rounded-lg border p-3 bg-muted/30">
              <p className="text-sm font-semibold">{offer.title}</p>
              <p className="text-2xl font-bold text-primary mt-1">R$ {amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Você receberá +{points} pontos após a confirmação</p>
            </div>
            <div className="space-y-2">
              <Label>WhatsApp (opcional, agiliza a confirmação)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(92) 90000-0000" />
            </div>
            <Button className="w-full" onClick={generate} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}
              Gerar PIX
            </Button>
          </div>
        )}

        {order && (
          <div className="space-y-3">
            {qrDataUrl && (
              <div className="flex justify-center bg-white p-3 rounded-lg">
                <img src={qrDataUrl} alt="QR Code PIX" className="w-56 h-56" />
              </div>
            )}
            <div className="text-center text-sm">
              <p className="text-muted-foreground">Valor</p>
              <p className="text-2xl font-bold text-primary">R$ {amount.toFixed(2)}</p>
            </div>
            <div className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Chave {(pixDetails?.type || 'PIX').toUpperCase()}</span>
                <Button size="sm" variant="ghost" onClick={copyKey}><Copy className="w-3 h-3 mr-1" />Copiar</Button>
              </div>
              <p className="font-mono text-sm break-all">{pixDetails?.value}</p>
              <p className="text-xs text-muted-foreground">Titular: {pixDetails?.holder || businessName || 'Anunciante'}{pixDetails?.bank ? ` · ${pixDetails.bank}` : ''}</p>
              <p className="text-xs text-muted-foreground">Código do pedido: <span className="font-mono">{order.tx_code}</span></p>
            </div>

            {paidStatus === 'pago' ? (
              <Alert className="border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">
                  Pagamento confirmado! +{points} pontos creditados.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertDescription className="text-xs">
                  Após o pagamento, aguarde a confirmação do anunciante. Os pontos serão creditados automaticamente.
                </AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              onClick={sendReceiptWhatsApp}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Enviar comprovante via WhatsApp
            </Button>
            {!businessContact?.whatsapp && !businessContact?.phone && (
              <p className="text-[11px] text-muted-foreground text-center -mt-1">
                O anunciante não cadastrou WhatsApp — escolha o contato ao abrir o app.
              </p>
            )}
            <Button variant="outline" className="w-full" onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
