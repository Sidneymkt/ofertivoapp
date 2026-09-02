import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Smartphone, QrCode, Hash, MapPin, Trophy } from 'lucide-react';

const CheckinInstructions: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          Como Funciona o Sistema de Check-in
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          
          {/* Fluxo do Cliente */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" />
              Fluxo do Cliente (Consumidor)
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">1</Badge>
                <span>Cliente vê a oferta no app e vai até o estabelecimento</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">2</Badge>
                <span>No local, abre o app e clica em "Fazer Check-in"</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-xs mt-0.5">3</Badge>
                <span>Escolhe entre <strong>Escanear QR Code</strong> ou <strong>Digitar código manual</strong></span>
              </div>
            </div>
          </div>

          {/* Métodos de Validação */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Métodos de Validação</h4>
            
            <div className="grid gap-3">
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <QrCode className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">QR Code</div>
                  <div className="text-xs text-muted-foreground">
                    Cliente escaneia o QR Code impresso ou exibido no estabelecimento
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 border rounded-lg">
                <Hash className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">Código Manual</div>
                  <div className="text-xs text-muted-foreground">
                    Atendente fornece código que o cliente digita no app
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Validações Automáticas */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-500" />
              Validações Automáticas do Sistema
            </h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Geolocalização (raio de até 100m do estabelecimento)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Validação de código/QR válido e ativo</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Prevenção de check-ins duplicados no mesmo dia</span>
              </div>
            </div>
          </div>

          {/* Recompensas */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-green-600" />
              <span className="font-medium text-sm text-green-800">Recompensas</span>
            </div>
            <div className="text-xs text-green-700">
              • Cliente recebe confirmação visual no app<br/>
              • Pontos de gamificação são adicionados automaticamente<br/>
              • Possibilidade de benefícios extras (conforme plano)
            </div>
          </div>

        </div>
      </CardContent>
    </Card>
  );
};

export default CheckinInstructions;