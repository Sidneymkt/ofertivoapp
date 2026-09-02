import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Zap, TrendingDown, Clock, Sun, Moon, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface AIMarketingSuggestionsProps {
  businessId: string;
}

interface AISuggestion {
  id: string;
  emoji: string;
  title: string;
  description: string;
  action: string;
  actionLabel: string;
  priority: 'high' | 'medium' | 'low';
}

export const AIMarketingSuggestions = ({ businessId }: AIMarketingSuggestionsProps) => {
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateSmartSuggestions();
  }, [businessId]);

  const generateSmartSuggestions = async () => {
    try {
      // Fetch business data
      const [offersRes, checkinsRes, followsRes] = await Promise.all([
        supabase.from('offers').select('*').eq('business_id', businessId).is('deleted_at', null),
        supabase.from('offer_checkins').select('created_at').eq('business_id', businessId),
        supabase.from('follows').select('id').eq('business_id', businessId),
      ]);

      const offers = offersRes.data || [];
      const checkins = checkinsRes.data || [];
      const followers = followsRes.data || [];
      const hour = new Date().getHours();
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      const activeOffers = offers.filter(o => o.is_active && !o.archived_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCheckins = checkins.filter(c => new Date(c.created_at) >= today).length;

      const newSuggestions: AISuggestion[] = [];

      // Time-based suggestions
      if (hour >= 10 && hour <= 12 && activeOffers.length > 0) {
        const hasLunchOffer = offers.some(o => o.category === 'Alimentação' && o.is_active);
        if (!hasLunchOffer) {
          newSuggestions.push({
            id: 'lunch-time',
            emoji: '🍽️',
            title: 'Hora do almoço se aproximando!',
            description: 'Crie uma oferta de almoço rápida para atrair clientes famintos agora.',
            action: 'create-lunch',
            actionLabel: 'Criar oferta de almoço',
            priority: 'high',
          });
        }
      }

      if (hour >= 17 && hour <= 19) {
        newSuggestions.push({
          id: 'happy-hour',
          emoji: '🍻',
          title: 'Happy Hour! Movimento aumenta agora',
          description: 'Uma oferta relâmpago de 2h pode triplicar seu movimento noturno.',
          action: 'create-flash',
          actionLabel: 'Criar oferta relâmpago',
          priority: 'high',
        });
      }

      // Low engagement detection
      if (todayCheckins === 0 && activeOffers.length > 0 && hour >= 14) {
        newSuggestions.push({
          id: 'low-movement',
          emoji: '📉',
          title: 'Baixa movimentação hoje',
          description: 'Nenhum check-in até agora. Uma oferta relâmpago pode reverter isso rapidamente.',
          action: 'create-flash',
          actionLabel: 'Criar oferta relâmpago',
          priority: 'high',
        });
      }

      // No active offers
      if (activeOffers.length === 0) {
        newSuggestions.push({
          id: 'no-offers',
          emoji: '🚀',
          title: 'Você não tem ofertas ativas!',
          description: 'Sem ofertas, clientes não te encontram. Crie uma em segundos.',
          action: 'create-any',
          actionLabel: 'Criar oferta agora',
          priority: 'high',
        });
      }

      // Weekend suggestion
      if (isWeekend && activeOffers.length < 3) {
        newSuggestions.push({
          id: 'weekend',
          emoji: '🎉',
          title: 'Final de semana = mais movimento',
          description: 'Aproveite o fluxo de pessoas e crie ofertas especiais de fim de semana.',
          action: 'create-combo',
          actionLabel: 'Criar combo econômico',
          priority: 'medium',
        });
      }

      // Growth suggestions
      if (followers.length < 50) {
        newSuggestions.push({
          id: 'grow-followers',
          emoji: '📣',
          title: 'Conquiste mais seguidores',
          description: `Você tem ${followers.length} seguidores. Ofertas exclusivas para novos clientes ajudam a crescer.`,
          action: 'create-first-use',
          actionLabel: 'Criar oferta para novos',
          priority: 'medium',
        });
      }

      // Offer without images
      const offersNoImage = offers.filter(o => o.is_active && !o.image_url);
      if (offersNoImage.length > 0) {
        newSuggestions.push({
          id: 'add-images',
          emoji: '📸',
          title: `${offersNoImage.length} oferta(s) sem foto`,
          description: 'Ofertas com fotos recebem 3x mais visualizações. Adicione imagens!',
          action: 'manage-offers',
          actionLabel: 'Gerenciar ofertas',
          priority: 'medium',
        });
      }

      // Default if empty
      if (newSuggestions.length === 0) {
        newSuggestions.push({
          id: 'default',
          emoji: '✨',
          title: 'Tudo certo por aqui!',
          description: 'Suas ofertas estão ativas e performando bem. Continue assim!',
          action: 'none',
          actionLabel: '',
          priority: 'low',
        });
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      newSuggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

      setSuggestions(newSuggestions.slice(0, 3));
    } catch (error) {
      console.error('Erro ao gerar sugestões:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string) => {
    switch (action) {
      case 'create-lunch':
        navigate('/anunciante/ofertas/nova', {
          state: { prefilled: { title: 'Almoço Especial do Dia', description: 'Prato do dia com desconto!', offerType: 'standard' } },
        });
        break;
      case 'create-flash':
        navigate('/anunciante/ofertas/nova', {
          state: { prefilled: { title: 'Oferta Relâmpago!', description: 'Por tempo limitado!', offerType: 'flash' } },
        });
        break;
      case 'create-combo':
        navigate('/anunciante/ofertas/nova', {
          state: { prefilled: { title: 'Combo Econômico', description: 'Leve mais, pague menos!', offerType: 'combo' } },
        });
        break;
      case 'create-first-use':
        navigate('/anunciante/ofertas/nova', {
          state: { prefilled: { title: 'Desconto de Boas-Vindas', description: 'Primeira vez? Ganhe desconto!', offerType: 'first-use' } },
        });
        break;
      case 'create-any':
        navigate('/anunciante/ofertas/nova');
        break;
      case 'manage-offers':
        navigate('/anunciante/ofertas');
        break;
    }
  };

  if (loading || suggestions.length === 0) return null;

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'medium': return 'border-l-4 border-l-amber-500 bg-amber-500/5';
      default: return 'border-l-4 border-l-green-500 bg-green-500/5';
    }
  };

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardHeader className="pb-2 p-4 sm:p-5 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="bg-primary/10 rounded-full p-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          Sugestões de Marketing IA
          <Badge variant="outline" className="text-[10px] ml-auto border-primary/30 text-primary">
            Personalizado
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2.5">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className={`p-3 rounded-lg ${getPriorityStyle(suggestion.priority)} transition-all`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">{suggestion.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold">{suggestion.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{suggestion.description}</p>
                {suggestion.action !== 'none' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 h-7 text-xs text-primary hover:text-primary px-2"
                    onClick={() => handleAction(suggestion.action)}
                  >
                    {suggestion.actionLabel}
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
