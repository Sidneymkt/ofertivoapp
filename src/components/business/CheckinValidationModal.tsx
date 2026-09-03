import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Hash, QrCode, CheckCircle, AlertCircle, ScanLine, Trophy, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import QrScanner from 'qr-scanner';
import { supabase } from '@/lib/supabase';

interface CheckinValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerTitle: string;
}

interface ValidationResult {
  success: boolean;
  message: string;
  points?: number;
  checkinId?: string;
  alreadyValidated?: boolean;
}

const CheckinValidationModal: React.FC<CheckinValidationModalProps> = ({
  isOpen,
  onClose,
  offerId,
  offerTitle
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const [validationMode, setValidationMode] = useState<'select' | 'qr' | 'manual' | 'delivery'>('select');
  const [manualCode, setManualCode] = useState('');
  const [qrContent, setQrContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [businessLocation, setBusinessLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isDelivery, setIsDelivery] = useState(false);
  const [deliveryClients, setDeliveryClients] = useState<{ id: string; user_id: string; name: string; label: string }[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [scoringUserId, setScoringUserId] = useState<string | null>(null);

  // Capturar localização do negócio quando modal abre
  useEffect(() => {
    if (isOpen && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setBusinessLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Geolocation error:', error);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 }
      );
    }
  }, [isOpen]);

  // Detectar modo delivery da oferta e carregar clientes para pontuar
  const loadDeliveryClients = React.useCallback(async () => {
    setLoadingClients(true);
    try {
      const { data: orders } = await (supabase as any)
        .from('offer_orders')
        .select('id, consumer_id, status, created_at')
        .eq('offer_id', offerId)
        .neq('status', 'cancelado')
        .order('created_at', { ascending: false })
        .limit(50);

      const list = (orders || []) as any[];
      const ids = [...new Set(list.map(o => o.consumer_id))];
      const { data: profiles } = ids.length
        ? await supabase.from('profiles').select('user_id, full_name').in('user_id', ids)
        : { data: [] as any[] };
      const pMap = new Map<any, any>((profiles || []).map((p: any) => [p.user_id, p.full_name]));

      setDeliveryClients(list.map(o => ({
        id: o.id,
        user_id: o.consumer_id,
        name: pMap.get(o.consumer_id) || 'Cliente',
        label: o.status === 'pago' ? 'Pago' : 'Pendente',
      })));
    } finally {
      setLoadingClients(false);
    }
  }, [offerId]);

  useEffect(() => {
    if (!isOpen || !offerId) return;
    let active = true;
    (async () => {
      const { data } = await supabase.from('offers').select('is_delivery').eq('id', offerId).maybeSingle();
      if (!active) return;
      const delivery = !!(data as any)?.is_delivery;
      setIsDelivery(delivery);
      if (delivery) {
        setValidationMode('delivery');
        loadDeliveryClients();
      }
    })();
    return () => { active = false; };
  }, [isOpen, offerId, loadDeliveryClients]);

  const handleDeliveryScore = async (userId: string) => {
    setScoringUserId(userId);
    try {
      const { data, error } = await (supabase as any).rpc('confirm_delivery_checkin' as any, {
        p_offer_id: offerId,
        p_user_id: userId,
      });
      if (error) throw error;
      const res = data as { success: boolean; message: string; points_awarded?: number; already_validated?: boolean };
      setResult({
        success: res.success,
        message: res.message,
        points: res.points_awarded || 0,
        alreadyValidated: !!res.already_validated,
      });
      if (res.success) {
        toast({
          title: '✅ Entrega confirmada!',
          description: `Cliente ganhou +${res.points_awarded || 0} pontos`,
          className: 'bg-green-500 text-white border-green-600',
        });
        window.dispatchEvent(new CustomEvent('checkinValidated'));
        loadDeliveryClients();
      } else {
        toast({ title: '❌ Não foi possível pontuar', description: res.message, variant: 'destructive' });
      }
    } catch (e: any) {
      setResult({ success: false, message: e?.message || 'Erro ao confirmar entrega' });
    } finally {
      setScoringUserId(null);
    }
  };


  // Limpar estado quando modal fecha
  useEffect(() => {
    if (!isOpen) {
      setValidationMode('select');
      setManualCode('');
      setQrContent('');
      setResult(null);
      stopScanner();
    }
  }, [isOpen]);

  const startQRScanner = async () => {
    if (!videoRef.current) return;

    try {
      scannerRef.current = new QrScanner(
        videoRef.current,
        async (result) => {
          setQrContent(result.data);
          stopScanner();
          toast({
            title: 'QR Code lido',
            description: 'Clique em Validar para processar o check-in.',
          });
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 5,
        }
      );
      await scannerRef.current.start();
    } catch (error) {
      console.error('Erro ao iniciar scanner:', error);
      toast({
        title: 'Erro na câmera',
        description: 'Não foi possível acessar a câmera. Tente o código manual.',
        variant: 'destructive',
      });
      setValidationMode('manual');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
  };

  const handleValidation = async (codeOrQr: string) => {
    if (!user) {
      toast({
        title: 'Erro de autenticação',
        description: 'Você precisa estar logado para validar check-ins.',
        variant: 'destructive',
      });
      return;
    }

    setIsValidating(true);

    try {
      // Tentar parsear como JSON (QR Code com dados completos)
      let qrData;
      let isManualCode = false;
      
      try {
        qrData = JSON.parse(codeOrQr);
        isManualCode = false;
      } catch {
        // Se não é JSON, é um código manual
        isManualCode = true;
      }

      let response: { success: boolean; message: string; points?: number; points_awarded?: number; checkin_id?: string; already_validated?: boolean };

      if (isManualCode) {
        // Código manual - não pode ser validado pelo anunciante diretamente
        // O código manual é para o CLIENTE digitar no app dele
        setResult({
          success: false,
          message: 'Códigos manuais são para o cliente digitar. Escaneie o QR Code do cliente ou peça o código gerado no app do usuário.',
        });
        setIsValidating(false);
        return;
      }

      // Validar QR Code com dados do cliente
      if (!qrData?.offerId || !qrData?.userId) {
        setResult({
          success: false,
          message: 'QR Code inválido. O QR do cliente deve conter offerId e userId.',
        });
        setIsValidating(false);
        return;
      }

      // Chamar função RPC do Supabase para validar check-in
      const { data, error } = await supabase.rpc('process_qr_validation', {
        qr_data_param: qrData,
        user_id_param: qrData.userId,
        location_lat: businessLocation?.lat || null,
        location_lng: businessLocation?.lng || null,
      });

      if (error) {
        console.error('Erro na validação:', error);
        setResult({
          success: false,
          message: error.message || 'Erro interno. Tente novamente.',
        });
      } else {
        response = data as unknown as typeof response;
        
        setResult({
          success: response.success,
          message: response.message,
          points: response.points_awarded ?? response.points ?? 0,
          checkinId: response.checkin_id,
          alreadyValidated: !!response.already_validated,
        });

        if (response.success) {
          toast({
            title: '✅ Check-in validado!',
            description: response.already_validated
              ? 'Este check-in já estava confirmado e não foi duplicado.'
              : `Cliente ganhou +${response.points_awarded ?? response.points ?? 0} pontos`,
            className: 'bg-green-500 text-white border-green-600',
            duration: 4000,
          });
          
          // Disparar evento para atualização em tempo real
          window.dispatchEvent(new CustomEvent('checkinValidated'));
        } else {
          toast({
            title: '❌ Falha na validação',
            description: response.message,
            variant: 'destructive',
            duration: 5000,
          });
        }
      }
    } catch (error) {
      console.error('Erro inesperado:', error);
      setResult({
        success: false,
        message: 'Não foi possível validar o check-in. Verifique o código ou QR.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleQRValidation = () => {
    if (!qrContent.trim()) {
      toast({
        title: 'QR Code necessário',
        description: 'Escaneie o QR Code do cliente primeiro.',
        variant: 'destructive',
      });
      return;
    }
    handleValidation(qrContent);
  };

  const handleManualValidation = () => {
    if (!manualCode.trim()) {
      toast({
        title: 'Código obrigatório',
        description: 'Digite o código para continuar.',
        variant: 'destructive',
      });
      return;
    }
    handleValidation(manualCode);
  };

  const resetAndTryAgain = () => {
    setResult(null);
    setManualCode('');
    setQrContent('');
    setValidationMode('select');
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="truncate">Validar Check-in - {offerTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!result ? (
            <>
              {validationMode === 'delivery' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-sm font-medium">Oferta em modo delivery 🛵</p>
                    <p className="text-xs text-muted-foreground">
                      Não é preciso QR Code. Confirme a entrega do cliente e os pontos são creditados automaticamente.
                    </p>
                  </div>

                  {loadingClients ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Carregando clientes...</p>
                  ) : deliveryClients.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      Nenhum pedido de delivery encontrado para esta oferta.
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {deliveryClients.map((c) => (
                        <div key={c.id} className="flex items-center justify-between gap-3 border rounded-lg p-3">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <Badge variant="outline" className="text-xs mt-1">{c.label}</Badge>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleDeliveryScore(c.user_id)}
                            disabled={scoringUserId === c.user_id}
                          >
                            {scoringUserId === c.user_id ? 'Pontuando...' : 'Confirmar entrega'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button variant="ghost" className="w-full" onClick={() => setValidationMode('select')}>
                    Usar QR Code / código manual
                  </Button>
                </div>
              )}

              {validationMode === 'select' && (

                <div className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    Como você deseja validar o check-in do cliente?
                  </p>
                  
                  <div className="grid gap-3">
                    <Button
                      onClick={() => {
                        setValidationMode('qr');
                        setTimeout(startQRScanner, 100);
                      }}
                      className="h-12 flex items-center gap-3"
                      disabled={isValidating}
                    >
                      <Camera className="w-5 h-5" />
                      Escanear QR Code do Cliente
                    </Button>
                    
                    <Button
                      variant="outline"
                      onClick={() => setValidationMode('manual')}
                      className="h-12 flex items-center gap-3"
                      disabled={isValidating}
                    >
                      <Hash className="w-5 h-5" />
                      Validar Código Manual
                    </Button>
                  </div>
                </div>
              )}

              {validationMode === 'qr' && (
                <div className="space-y-4">
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      autoPlay
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-white rounded-lg">
                        <ScanLine className="w-full h-full text-white/70 animate-pulse" />
                      </div>
                    </div>
                  </div>
                  
                  {qrContent && (
                    <Card>
                      <CardContent className="p-4">
                        <p className="text-sm text-muted-foreground mb-2">QR Code lido:</p>
                        <p className="text-xs font-mono bg-muted p-2 rounded break-all">
                          {qrContent}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        stopScanner();
                        setValidationMode('select');
                      }}
                      className="flex-1"
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleQRValidation}
                      className="flex-1"
                      disabled={isValidating || !qrContent}
                    >
                      {isValidating ? 'Validando...' : 'Validar Check-in'}
                    </Button>
                  </div>
                </div>
              )}

              {validationMode === 'manual' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Código do Cliente</label>
                    <Input
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                      placeholder="Digite o código que o cliente apresentou"
                      disabled={isValidating}
                      className="text-center text-lg font-mono"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      O cliente deve apresentar um código gerado no app
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setValidationMode('select')}
                      className="flex-1"
                      disabled={isValidating}
                    >
                      Voltar
                    </Button>
                    <Button
                      onClick={handleManualValidation}
                      className="flex-1"
                      disabled={isValidating || !manualCode.trim()}
                    >
                      {isValidating ? 'Validando...' : 'Validar Check-in'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center space-y-4 relative overflow-hidden">
              {result.success ? (
                <>
                  {/* Confetti Animation Background */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute w-3 h-3 animate-bounce"
                        style={{
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                          borderRadius: i % 2 === 0 ? '50%' : '0',
                          animationDelay: `${Math.random() * 0.5}s`,
                          animationDuration: `${1 + Math.random()}s`,
                          opacity: 0.7,
                        }}
                      />
                    ))}
                  </div>

                  {/* Success Icon with Glow */}
                  <div className="flex justify-center relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-green-500/20 animate-ping" />
                    </div>
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-green-400 to-green-600 shadow-2xl shadow-green-500/50 animate-in zoom-in-75 duration-500 relative z-10">
                      <CheckCircle className="w-12 h-12 sm:w-14 sm:h-14 text-white drop-shadow-lg" />
                    </div>
                  </div>
                  
                    <div className="space-y-4 sm:space-y-5 relative z-10">
                    <div className="space-y-2">
                      <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent animate-in slide-in-from-bottom duration-300">
                        ✨ Check-in Validado! ✨
                      </h3>
                      <p className="text-base sm:text-lg text-muted-foreground font-medium">
                        O cliente recebeu os pontos na carteira dele!
                      </p>
                    </div>
                     
                    {result.points && result.points > 0 && (
                      <div className="flex items-center justify-center gap-2 animate-in slide-in-from-bottom duration-500">
                        <div className="relative">
                          <div className="absolute inset-0 bg-green-500/30 blur-xl rounded-full" />
                          <Badge className="relative text-xl sm:text-2xl px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 shadow-lg shadow-green-500/30">
                            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 mr-3 animate-bounce" />
                            +{result.points} pontos para o cliente
                          </Badge>
                        </div>
                      </div>
                    )}
                     
                    <div className="p-5 sm:p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border-2 border-green-500/30 backdrop-blur-sm animate-in fade-in duration-700">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-green-600">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <p className="text-sm sm:text-base font-medium">Check-in registrado no sistema</p>
                        </div>
                        <div className="flex items-center gap-3 text-green-600">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <p className="text-sm sm:text-base font-medium">Pontos creditados na carteira do cliente</p>
                        </div>
                        <div className="flex items-center gap-3 text-green-600">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <CheckCircle className="w-4 h-4" />
                          </div>
                          <p className="text-sm sm:text-base font-medium">Uso da oferta contabilizado</p>
                        </div>
                      </div>
                    </div>

                    {result.checkinId && (
                      <p className="text-xs text-muted-foreground">
                        ID da validação: {result.checkinId.substring(0, 8)}...
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 relative z-10">
                    <Button 
                      onClick={resetAndTryAgain} 
                      variant="outline"
                      className="w-full sm:flex-1 h-12 text-base" 
                      size="lg"
                    >
                      <QrCode className="w-5 h-5 mr-2" />
                      Novo Check-in
                    </Button>
                    <Button 
                      onClick={() => {
                        handleClose();
                        navigate('/business/crm');
                      }}
                      className="w-full sm:flex-1 h-12 text-base bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30" 
                      size="lg"
                    >
                      <LayoutDashboard className="w-5 h-5 mr-2" />
                      Ver Dashboard CRM
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center bg-destructive/10 border-2 border-destructive animate-in zoom-in duration-300">
                      <AlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-destructive" />
                    </div>
                  </div>
                  
                  <div className="space-y-3 sm:space-y-4">
                    <div className="space-y-1 sm:space-y-2">
                      <h3 className="text-xl sm:text-2xl font-bold text-destructive">
                        Check-in não validado ❌
                      </h3>
                      <p className="text-sm sm:text-base text-muted-foreground text-center">{result.message}</p>
                    </div>
                    
                    <div className="p-4 sm:p-6 bg-destructive/10 rounded-lg border-2 border-destructive/30">
                      <p className="text-xs sm:text-sm text-destructive font-medium mb-2 sm:mb-3">
                        Possíveis motivos:
                      </p>
                      <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-destructive">
                        <p>• Código inválido, expirado ou já utilizado</p>
                        <p>• QR Code não corresponde a esta oferta</p>
                        <p>• Check-in já realizado hoje</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={handleClose}
                      className="w-full sm:flex-1"
                      size="lg"
                    >
                      Fechar
                    </Button>
                    <Button
                      onClick={resetAndTryAgain}
                      className="w-full sm:flex-1"
                      size="lg"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                 </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinValidationModal;