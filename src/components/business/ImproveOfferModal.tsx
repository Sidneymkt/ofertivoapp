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
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Clock, Hash, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getEdgeFunctionError, isAiQuotaError } from '@/lib/edgeError';
import { buildLocalOfferImprovement } from '@/lib/offerCopyFallback';

interface ImproveOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: string;
    title: string;
    description: string;
    category: string;
    original_price: number;
    discounted_price: number;
    image_url?: string;
  };
  businessName: string;
  onSave: (updates: { title: string; description: string }) => Promise<void>;
}

export const ImproveOfferModal = ({ 
  isOpen, 
  onClose, 
  offer, 
  businessName,
  onSave 
}: ImproveOfferModalProps) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    title: string;
    description: string;
    cta: string;
    hashtags: string[];
    bestTime: string;
    imageUrl: string;
  } | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const discount = Math.round(((offer.original_price - offer.discounted_price) / offer.original_price) * 100);
      
      const prompt = `
Analise esta oferta e sugira melhorias:

OFERTA ATUAL:
- Título: ${offer.title}
- Descrição: ${offer.description || 'Sem descrição'}
- Negócio: ${businessName}
- Categoria: ${offer.category}
- Desconto: ${discount}%
- Preço: De R$ ${offer.original_price.toFixed(2)} por R$ ${offer.discounted_price.toFixed(2)}

GERE:
1. Título otimizado (max 60 chars, urgente, com benefício)
2. Descrição AIDA (max 180 chars, persuasiva, gatilhos mentais)
3. CTA impactante (max 30 chars)
4. 5 hashtags relevantes para a sua cidade
5. Melhor horário para publicar (formato: HH:MM)
6. Sugestão de tipo de imagem ideal

Retorne em formato JSON:
{
  "title": "string",
  "description": "string",
  "cta": "string",
  "hashtags": ["string"],
  "bestTime": "18:00",
  "imageDescription": "string"
}
`;

      const { data, error } = await supabase.functions.invoke('marketing-ai', {
        body: { prompt, action: 'improve_offer' }
      });

      if (error) throw error;

      if (data.suggestions) {
        setSuggestions({
          ...data.suggestions,
          imageUrl: offer.image_url || ''
        });
        setEditedTitle(data.suggestions.title);
        setEditedDescription(data.suggestions.description);
      }
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
      const { status, message } = await getEdgeFunctionError(error);
      const local = buildLocalOfferImprovement({
        title: offer.title,
        description: offer.description,
        category: offer.category,
        businessName,
        originalPrice: offer.original_price,
        discountedPrice: offer.discounted_price,
      });
      setSuggestions({ ...local, imageUrl: offer.image_url || '' });
      setEditedTitle(local.title);
      setEditedDescription(local.description);
      if (isAiQuotaError(status, message)) {
        toast.info('IA indisponível no momento (créditos/limite). Geramos sugestões automáticas sem IA.');
      } else {
        toast.warning(`IA indisponível: ${message}. Sugestões geradas sem IA.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await onSave({
        title: editedTitle,
        description: editedDescription
      });
      toast.success('Oferta melhorada com sucesso!');
      onClose();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar alterações');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Melhorar Oferta com IA
          </DialogTitle>
          <DialogDescription>
            Use inteligência artificial para otimizar sua oferta e aumentar conversões
          </DialogDescription>
        </DialogHeader>

        {!suggestions ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <p className="text-center text-muted-foreground">
              Clique no botão abaixo para a IA analisar e melhorar sua oferta
            </p>
            <Button 
              onClick={generateSuggestions}
              disabled={loading}
              className="bg-gradient-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Gerar Sugestões com IA
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Título */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Título Otimizado</label>
              <Input
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                maxLength={60}
                placeholder="Título da oferta"
              />
              <p className="text-xs text-muted-foreground">
                {editedTitle.length}/60 caracteres
              </p>
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição AIDA</label>
              <Textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                maxLength={180}
                rows={4}
                placeholder="Descrição persuasiva"
              />
              <p className="text-xs text-muted-foreground">
                {editedDescription.length}/180 caracteres
              </p>
            </div>

            {/* CTA */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Call-to-Action Sugerido
              </label>
              <Badge variant="secondary" className="text-base px-4 py-2">
                {suggestions.cta}
              </Badge>
            </div>

            {/* Hashtags */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Hashtags Recomendadas
              </label>
              <div className="flex flex-wrap gap-2">
                {suggestions.hashtags.map((tag, idx) => (
                  <Badge key={idx} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Melhor Horário */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Melhor Horário para Publicar
              </label>
              <Badge className="bg-gradient-points">
                {suggestions.bestTime}
              </Badge>
              <p className="text-xs text-muted-foreground">
                Horário com maior engajamento na sua cidade
              </p>
            </div>

            {/* Imagem */}
            {suggestions.imageUrl && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Imagem da Oferta
                </label>
                <img 
                  src={suggestions.imageUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            )}

            {/* Ações */}
            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                variant="outline"
                onClick={generateSuggestions}
                disabled={loading}
              >
                Gerar Novamente
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-gradient-primary"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
