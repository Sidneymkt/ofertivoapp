import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, TrendingUp, Target, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessName: string;
}

export const CreateCampaignModal = ({ 
  isOpen, 
  onClose, 
  businessName 
}: CreateCampaignModalProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<'input' | 'suggestions'>('input');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    product: '',
    objective: '',
    duration: ''
  });

  const [campaign, setCampaign] = useState<{
    offerType: string;
    title: string;
    description: string;
    cta: string;
    imageDescription: string;
    suggestedPrice: { original: number; discounted: number };
  } | null>(null);

  const generateCampaign = async () => {
    if (!formData.product || !formData.objective || !formData.duration) {
      toast.error('Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      const prompt = `
Crie uma campanha de marketing completa para:

INFORMAÇÕES:
- Negócio: ${businessName}
- Produto/Serviço: ${formData.product}
- Objetivo: ${formData.objective}
- Duração: ${formData.duration}

GERE:
1. Tipo ideal de oferta (Flash Sale/Exclusiva App/Combo/Primeiro Uso)
2. Título atrativo (max 60 chars)
3. Descrição AIDA (max 180 chars)
4. CTA impactante
5. Sugestão de imagem ideal
6. Preços sugeridos (original e com desconto)

Retorne em formato JSON:
{
  "offerType": "string",
  "title": "string",
  "description": "string",
  "cta": "string",
  "imageDescription": "string",
  "suggestedPrice": {
    "original": number,
    "discounted": number
  }
}
`;

      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { prompt, action: 'create_campaign' }
      });

      if (error) throw error;

      if (data.campaign) {
        setCampaign(data.campaign);
        setStep('suggestions');
      }
    } catch (error) {
      console.error('Erro ao gerar campanha:', error);
      toast.error('Erro ao gerar campanha com IA');
    } finally {
      setLoading(false);
    }
  };

  const createOffer = () => {
    if (!campaign) return;
    
    // Mapeamento dos tipos de oferta da IA para os valores do formulário
    const offerTypeMap: Record<string, string> = {
      'Flash Sale': 'flash',
      'Oferta Relâmpago': 'flash',
      'Exclusiva App': 'first-use',
      'Primeiro Uso': 'first-use',
      'Combo': 'combo',
      'Combo Econômico': 'combo',
      'Check-in': 'checkin',
      'Check-in Premiado': 'checkin'
    };
    
    const mappedOfferType = offerTypeMap[campaign.offerType] || 'flash';
    
    // Navegar para criar oferta com dados pré-preenchidos
    const offerData = {
      title: campaign.title,
      description: campaign.description,
      offerType: mappedOfferType,
      originalPrice: campaign.suggestedPrice.original,
      discountedPrice: campaign.suggestedPrice.discounted
    };
    
    navigate('/anunciante/ofertas/nova', { state: { prefilled: offerData } });
    onClose();
  };

  const getOfferTypeBadge = (type: string) => {
    const types: Record<string, { label: string; color: string }> = {
      'Flash Sale': { label: '⚡ Flash Sale', color: 'bg-red-500' },
      'Exclusiva App': { label: '📱 Exclusiva App', color: 'bg-blue-500' },
      'Combo': { label: '🎁 Combo', color: 'bg-green-500' },
      'Primeiro Uso': { label: '🆕 Primeiro Uso', color: 'bg-purple-500' }
    };
    
    const typeInfo = types[type] || { label: type, color: 'bg-gray-500' };
    return (
      <Badge className={`${typeInfo.color} text-white`}>
        {typeInfo.label}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Criar Campanha com IA
          </DialogTitle>
          <DialogDescription>
            Deixe a IA criar uma campanha de marketing completa para você
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Produto ou Serviço</label>
              <Input
                value={formData.product}
                onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                placeholder="Ex: Pizza Grande, Corte de Cabelo, Conserto de Celular"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Objetivo da Campanha</label>
              <Select 
                value={formData.objective}
                onValueChange={(value) => setFormData({ ...formData, objective: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o objetivo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vender">Aumentar Vendas</SelectItem>
                  <SelectItem value="trafego">Atrair Tráfego para Loja</SelectItem>
                  <SelectItem value="divulgar">Divulgar Novidade</SelectItem>
                  <SelectItem value="fidelizar">Fidelizar Clientes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duração da Campanha</label>
              <Select 
                value={formData.duration}
                onValueChange={(value) => setFormData({ ...formData, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a duração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 dia (Flash)</SelectItem>
                  <SelectItem value="3">3 dias</SelectItem>
                  <SelectItem value="7">1 semana</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">1 mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              onClick={generateCampaign}
              disabled={loading}
              className="w-full bg-gradient-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando Campanha...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Criar Campanha com IA
                </>
              )}
            </Button>
          </div>
        ) : campaign && (
          <div className="space-y-4">
            {/* Tipo de Oferta */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4" />
                Tipo de Oferta Ideal
              </label>
              {getOfferTypeBadge(campaign.offerType)}
              <p className="text-xs text-muted-foreground">
                Recomendado para seu objetivo: {formData.objective}
              </p>
            </div>

            {/* Título */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{campaign.title}</p>
              </div>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição AIDA</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{campaign.description}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Call-to-Action</label>
              <Badge variant="secondary" className="text-base px-4 py-2">
                {campaign.cta}
              </Badge>
            </div>

            {/* Preços */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Preços Sugeridos
              </label>
              <div className="flex gap-4">
                <div className="flex-1 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">De</p>
                  <p className="text-lg font-bold">
                    R$ {campaign.suggestedPrice.original.toFixed(2)}
                  </p>
                </div>
                <div className="flex-1 p-3 bg-gradient-points text-white rounded-lg">
                  <p className="text-xs opacity-90">Por</p>
                  <p className="text-lg font-bold">
                    R$ {campaign.suggestedPrice.discounted.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Sugestão de Imagem */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Imagem Recomendada</label>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">{campaign.imageDescription}</p>
              </div>
            </div>

            {/* Ações */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setStep('input')}>
                Voltar
              </Button>
              <Button 
                onClick={createOffer}
                className="bg-gradient-primary"
              >
                Criar Oferta Agora
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
