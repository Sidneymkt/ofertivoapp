import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, Utensils, Package, UserPlus, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QuickOfferTemplate {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  prefill: {
    title: string;
    description: string;
    offerType: string;
    validHours?: number;
  };
}

const templates: QuickOfferTemplate[] = [
  {
    id: 'flash',
    emoji: '⚡',
    title: 'Relâmpago 2h',
    subtitle: 'Urgência que converte',
    icon: Zap,
    color: 'from-amber-500 to-orange-600',
    prefill: {
      title: 'Oferta Relâmpago!',
      description: 'Por tempo limitado! Aproveite este desconto exclusivo disponível apenas nas próximas 2 horas.',
      offerType: 'flash',
      validHours: 2,
    },
  },
  {
    id: 'lunch',
    emoji: '🍽️',
    title: 'Almoço do Dia',
    subtitle: 'Atrai no horário certo',
    icon: Utensils,
    color: 'from-green-500 to-emerald-600',
    prefill: {
      title: 'Almoço Especial do Dia',
      description: 'Prato do dia com desconto especial! Venha almoçar com economia e sabor.',
      offerType: 'standard',
      validHours: 5,
    },
  },
  {
    id: 'combo',
    emoji: '📦',
    title: 'Combo Econômico',
    subtitle: 'Ticket médio maior',
    icon: Package,
    color: 'from-blue-500 to-indigo-600',
    prefill: {
      title: 'Combo Econômico Imperdível',
      description: 'Leve mais, pague menos! Combo especial com itens selecionados por um preço incrível.',
      offerType: 'combo',
    },
  },
  {
    id: 'first-use',
    emoji: '🆕',
    title: 'Novos Clientes',
    subtitle: 'Conquista na 1ª visita',
    icon: UserPlus,
    color: 'from-purple-500 to-violet-600',
    prefill: {
      title: 'Desconto de Boas-Vindas',
      description: 'Primeira vez aqui? Ganhe um desconto especial na sua primeira visita! Venha conhecer nosso espaço.',
      offerType: 'first-use',
    },
  },
];

export const QuickOfferTemplates = () => {
  const navigate = useNavigate();

  const handleSelect = (template: QuickOfferTemplate) => {
    // Calculate validUntil based on validHours if present
    let validUntil: string | undefined;
    if (template.prefill.validHours) {
      const date = new Date();
      date.setHours(date.getHours() + template.prefill.validHours);
      validUntil = date.toISOString().slice(0, 16);
    }

    navigate('/anunciante/ofertas/nova', {
      state: {
        prefilled: {
          title: template.prefill.title,
          description: template.prefill.description,
          offerType: template.prefill.offerType,
        },
      },
    });
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-2 p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Criar Oferta Rápida
          </CardTitle>
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            <Clock className="w-3 h-3 mr-1" />
            Em segundos
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          {templates.map((tpl) => (
            <Button
              key={tpl.id}
              variant="outline"
              className="h-auto p-3 sm:p-4 flex flex-col items-start gap-1.5 text-left hover:shadow-md transition-all hover:scale-[1.02] group border-muted"
              onClick={() => handleSelect(tpl)}
            >
              <div className="flex items-center gap-2 w-full">
                <span className="text-xl">{tpl.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{tpl.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{tpl.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
