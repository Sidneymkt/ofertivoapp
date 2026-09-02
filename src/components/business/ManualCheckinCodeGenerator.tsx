import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Copy, Hash, RefreshCw, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ManualCheckinCodeGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerTitle: string;
}

interface ManualCode {
  id: string;
  code: string;
  created_at: string;
  expires_at: string;
  used: boolean;
}

const ManualCheckinCodeGenerator: React.FC<ManualCheckinCodeGeneratorProps> = ({
  isOpen,
  onClose,
  offerId,
  offerTitle
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [currentCode, setCurrentCode] = useState<ManualCode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Atualizar countdown
  useEffect(() => {
    if (!currentCode || currentCode.used) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiry = new Date(currentCode.expires_at).getTime();
      const remaining = Math.max(0, Math.floor((expiry - now) / 1000));
      
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        setCurrentCode(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentCode]);

  // Gerar novo código manual
  const generateCode = async () => {
    if (!user) return;

    setIsGenerating(true);
    try {
      // Gerar código alfanumérico de 6 caracteres
      const code = Array.from({ length: 6 }, () => 
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
      ).join('');

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // 30 minutos de validade

      // Inserir código diretamente na tabela
      const { data, error } = await supabase
        .from('manual_checkin_codes')
        .insert({
          offer_id: offerId,
          business_id: user.id,
          code: code,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentCode({
        id: data.id,
        code: data.code,
        created_at: data.created_at,
        expires_at: data.expires_at,
        used: data.used || false
      });

      toast({
        title: '✅ Código gerado!',
        description: 'Novo código manual criado com validade de 30 minutos.',
      });
    } catch (error) {
      console.error('Erro ao gerar código:', error);
      toast({
        title: '❌ Erro ao gerar código',
        description: 'Tente novamente em alguns instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Copiar código
  const copyCode = () => {
    if (!currentCode) return;
    
    navigator.clipboard.writeText(currentCode.code);
    toast({
      title: '📋 Código copiado!',
      description: 'Código copiado para a área de transferência.',
    });
  };

  // Formatar tempo restante
  const formatTimeLeft = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Verificar se código expirou
  const isExpired = currentCode && timeLeft <= 0;

  // Limpar estado ao fechar
  useEffect(() => {
    if (!isOpen) {
      setCurrentCode(null);
      setTimeLeft(0);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Código Manual - {offerTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!currentCode || isExpired ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                Gere um código manual para que o cliente possa fazer check-in sem precisar escanear o QR Code.
              </p>
              
              <Button 
                onClick={generateCode} 
                disabled={isGenerating}
                className="w-full h-12"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4 mr-2" />
                    Gerar Novo Código
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Card className="border-2 border-primary">
                <CardContent className="p-6 text-center space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Código para Check-in Manual</p>
                    <div className="text-4xl font-mono font-bold tracking-widest text-primary">
                      {currentCode.code}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    {timeLeft > 0 ? (
                      <Badge variant="outline" className="text-sm">
                        Válido por {formatTimeLeft(timeLeft)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-sm">
                        Expirado
                      </Badge>
                    )}
                  </div>
                  
                  {currentCode.used && (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600 font-medium">
                        Código já utilizado
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <p className="text-xs text-center text-muted-foreground">
                Forneça este código ao cliente para validação manual do check-in
              </p>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={copyCode}
                  disabled={currentCode.used || timeLeft <= 0}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copiar
                </Button>
                <Button 
                  onClick={generateCode}
                  disabled={isGenerating}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Novo Código
                </Button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  💡 <strong>Dica:</strong> O cliente deve digitar este código ao fazer check-in manual no aplicativo.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualCheckinCodeGenerator;