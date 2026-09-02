import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, DollarSign, Utensils, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type HyperlocalFilter = 
  | 'nearby' 
  | 'open_now' 
  | 'under_10' 
  | 'lunch' 
  | 'top_bairro' 
  | 'flash';

interface HyperlocalFiltersProps {
  activeFilter: HyperlocalFilter | null;
  onFilterChange: (filter: HyperlocalFilter | null) => void;
  className?: string;
}

const filters: { key: HyperlocalFilter; label: string; icon: React.ElementType; emoji?: string }[] = [
  { key: 'nearby', label: 'Perto de você', icon: MapPin, emoji: '📍' },
  { key: 'open_now', label: 'Abertas agora', icon: Clock, emoji: '⏰' },
  { key: 'under_10', label: 'Até R$10', icon: DollarSign, emoji: '💸' },
  { key: 'lunch', label: 'Almoço barato', icon: Utensils, emoji: '🍽️' },
  { key: 'top_bairro', label: 'Top do bairro', icon: TrendingUp, emoji: '🔥' },
  { key: 'flash', label: 'Relâmpago', icon: Zap, emoji: '⚡' },
];

export const HyperlocalFilters = ({ activeFilter, onFilterChange, className }: HyperlocalFiltersProps) => {
  return (
    <div className={cn('overflow-x-auto scrollbar-hide -mx-4 px-4', className)}>
      <div className="flex gap-2 pb-1 w-max">
        {filters.map(({ key, label, icon: Icon, emoji }) => {
          const isActive = activeFilter === key;
          return (
            <Button
              key={key}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onFilterChange(isActive ? null : key)}
              className={cn(
                'rounded-full whitespace-nowrap flex-shrink-0 gap-1.5 text-xs sm:text-sm transition-all',
                isActive && 'bg-gradient-primary shadow-md scale-105'
              )}
            >
              <span className="text-sm">{emoji}</span>
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
