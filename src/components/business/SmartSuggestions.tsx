import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, Image as ImageIcon, Clock, Award } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface SmartSuggestionsProps {
  businessId: string;
}

interface Suggestion {
  id: string;
  icon: React.ReactNode;
  message: string;
  type: 'success' | 'info' | 'warning';
}

export const SmartSuggestions = ({ businessId }: SmartSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSuggestions();
  }, [businessId]);

  const generateSuggestions = async () => {
    try {
      // Buscar estatísticas das ofertas
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .eq('business_id', businessId)
        .is('deleted_at', null);

      if (!offers || offers.length === 0) {
        setSuggestions([{
          id: '1',
          icon: <Lightbulb className="w-5 h-5" />,
          message: 'Crie sua primeira oferta e comece a atrair clientes!',
          type: 'info'
        }]);
        return;
      }

      const newSuggestions: Suggestion[] = [];

      // Análise de imagens
      const offersWithImages = offers.filter(o => o.image_url || (o.image_urls && (o.image_urls as any[]).length > 0));
      const imageRate = (offersWithImages.length / offers.length) * 100;

      if (imageRate >= 80) {
        newSuggestions.push({
          id: 'img-good',
          icon: <ImageIcon className="w-5 h-5" />,
          message: `Parabéns! ${imageRate.toFixed(0)}% das suas ofertas têm imagens. Continue assim!`,
          type: 'success'
        });
      } else if (imageRate < 50) {
        newSuggestions.push({
          id: 'img-improve',
          icon: <ImageIcon className="w-5 h-5" />,
          message: 'Ofertas com imagens têm 42% mais cliques. Adicione fotos às suas ofertas!',
          type: 'warning'
        });
      }

      // Análise de horários (baseado em created_at)
      const hourCounts: Record<number, number> = {};
      offers.forEach(offer => {
        const hour = new Date(offer.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });

      const bestHour = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)[0];

      if (bestHour) {
        const [hour] = bestHour;
        const hourFormatted = `${hour}:00`;
        newSuggestions.push({
          id: 'time-best',
          icon: <Clock className="w-5 h-5" />,
          message: `Suas ofertas criadas às ${hourFormatted} têm melhor desempenho. Publique nesse horário!`,
          type: 'info'
        });
      }

      // Análise de performance
      const activeOffers = offers.filter(o => o.is_active && !o.archived_at);
      const totalViews = offers.reduce((sum, o) => sum + (o.views_count || 0), 0);
      const avgViews = totalViews / offers.length;

      if (avgViews > 50) {
        newSuggestions.push({
          id: 'views-good',
          icon: <TrendingUp className="w-5 h-5" />,
          message: `Suas ofertas têm média de ${avgViews.toFixed(0)} visualizações. Ótimo engajamento!`,
          type: 'success'
        });
      } else if (avgViews < 20 && offers.length > 3) {
        newSuggestions.push({
          id: 'views-low',
          icon: <TrendingUp className="w-5 h-5" />,
          message: 'Baixo engajamento? Tente criar sorteios para aumentar a visibilidade.',
          type: 'warning'
        });
      }

      // Análise de ofertas ativas
      const activeRate = (activeOffers.length / offers.length) * 100;
      if (activeRate < 30 && offers.length > 5) {
        newSuggestions.push({
          id: 'active-low',
          icon: <Award className="w-5 h-5" />,
          message: 'Poucas ofertas ativas. Mantenha mais ofertas ativas para atrair clientes!',
          type: 'warning'
        });
      }

      // Sugestão padrão se não houver outras
      if (newSuggestions.length === 0) {
        newSuggestions.push({
          id: 'default',
          icon: <Lightbulb className="w-5 h-5" />,
          message: 'Use o botão "Melhorar com IA" para otimizar suas ofertas!',
          type: 'info'
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || suggestions.length === 0) {
    return null;
  }

  const getVariantColor = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-50 dark:bg-green-950/20';
      case 'warning': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      default: return 'border-blue-500 bg-blue-50 dark:bg-blue-950/20';
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="mt-8 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Sugestões Inteligentes</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {suggestions.map((suggestion) => (
          <Card 
            key={suggestion.id}
            className={`p-4 border-l-4 ${getVariantColor(suggestion.type)}`}
          >
            <div className="flex items-start gap-3">
              <div className={getIconColor(suggestion.type)}>
                {suggestion.icon}
              </div>
              <p className="text-sm flex-1">{suggestion.message}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
